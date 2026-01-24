/**
 * Pull Service - Adaptive polling for Firebase changes
 * Increases interval when no changes, resets on user activity
 */

import { Firestore, collection, getDocs, query, where } from 'firebase/firestore';
import { saveProduct } from './indexeddb';
import { sendLowStockNotificationForUser } from './low-stock-notifications';

interface PullState {
  isRunning: boolean;
  lastPullTime: number;
  intervalMs: number;
  minInterval: number;
  maxInterval: number;
  noChangeCount: number;
  maxNoChangeBeforeIncrease: number;
}

let pullState: PullState = {
  isRunning: false,
  lastPullTime: 0,
  intervalMs: 10 * 60 * 1000, // 10 minutes
  minInterval: 10 * 60 * 1000, // 10 minutes
  maxInterval: 30 * 60 * 1000, // 30 minutes
  noChangeCount: 0,
  maxNoChangeBeforeIncrease: 1, // Increase after 1 cycle with no changes
};

let pullIntervalId: NodeJS.Timeout | null = null;

// Store Firebase context
let firebaseContext: { firestore: Firestore | null; userId: string | null } = {
  firestore: null,
  userId: null,
};

/**
 * Set Firebase context (called from layout-client)
 */
export function setFirebaseContextPull(firestore: Firestore, userId: string): void {
  firebaseContext = { firestore, userId };
}

/**
 * Start adaptive pull service (no parameters - uses stored context)
 */
export function startPullService(): () => void {
  if (pullState.isRunning) {
    console.log('[Pull] Service already running');
    return () => stopPullService();
  }

  console.log('[Pull] Starting adaptive pull service');
  pullState.isRunning = true;

  // Schedule periodic pulls
  const schedulePull = () => {
    if (pullIntervalId) clearTimeout(pullIntervalId);

    pullIntervalId = setTimeout(() => {
      pullFirebaseChangesFromContext().then(() => {
        schedulePull(); // Schedule next pull
      });
    }, pullState.intervalMs);

    console.log('[Pull] Next pull scheduled in', Math.round(pullState.intervalMs / 1000), 'seconds');
  };

  schedulePull();

  // Cleanup function
  return () => stopPullService();
}

/**
 * Stop pull service
 */
export function stopPullService(): void {
  console.log('[Pull] Stopping pull service');
  if (pullIntervalId) clearTimeout(pullIntervalId);
  pullState.isRunning = false;
  pullIntervalId = null;
}

/**
 * Reset to minimum interval on data modifications (add, edit, or delete)
 */
export function onUserActivity(actionType?: 'add' | 'edit' | 'delete'): void {
  // Only reset interval on data modification actions
  if (actionType && ['add', 'edit', 'delete'].includes(actionType)) {
    console.log(`[Pull] Data modification detected (${actionType}), resetting poll interval to`, pullState.minInterval);
    pullState.intervalMs = pullState.minInterval;
    pullState.noChangeCount = 0;
  } else if (actionType) {
    console.log(`[Pull] Activity detected (${actionType}), but not resetting interval (only add/edit/delete trigger reset)`);
  }
}

/**
 * Pull Firebase changes using stored context
 */
async function pullFirebaseChangesFromContext(): Promise<void> {
  const { firestore, userId } = firebaseContext;
  if (!firestore || !userId) {
    console.log('[Pull] Firebase context not initialized yet');
    return;
  }
  return pullFirebaseChanges(firestore, userId);
}

/**
 * Fetch changes from Firebase
 */
async function pullFirebaseChanges(firestore: Firestore, userId: string): Promise<void> {
  console.log('[Pull] Pulling changes from Firebase');

  try {
    const lastPull = pullState.lastPullTime;
    const now = Date.now();

    // Query products for this user (only userId filter - no compound index needed)
    // Filter by updatedAt in code to avoid needing a composite index
    const productsRef = collection(firestore, 'products');
    const q = query(
      productsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const updates: any[] = [];

    // Get ALL pending commit IDs to avoid overwriting local changes
    // This includes creates, updates, deletes, restores - any pending local operation
    let pendingCommitIds: string[] = [];
    try {
      const { getUnpushedCommits } = await import('./commit-queue');
      const commits = await getUnpushedCommits(userId);
      // Filter to only product commits, but include ALL types (not just deletes)
      pendingCommitIds = commits
        .filter((c) => c.collectionName === 'products')
        .map((c) => c.docId);
      if (pendingCommitIds.length > 0) {
        console.log('[Pull] Skipping', pendingCommitIds.length, 'products with pending local changes');
      }
    } catch (err) {
      console.warn('[Pull] Failed to check pending commits:', err);
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      // Skip products that have ANY pending local changes (don't overwrite local state)
      if (pendingCommitIds.includes(doc.id)) {
        console.log('[Pull] Skipping product with pending local changes:', doc.id);
        return;
      }
      // Filter by updatedAt in code (avoid composite index requirement)
      // Convert Firestore Timestamp to milliseconds for comparison
      const updatedAtMs = data.updatedAt?.toMillis?.() || data.updatedAt?.seconds * 1000 || 0;
      if ((!data.updatedAt || updatedAtMs > (lastPull || 0)) && data.isDeleted !== true) {
        updates.push({
          id: doc.id,
          ...data,
        });
      }
    });

    console.log('[Pull] Found', updates.length, 'updated products');

    // Save updates to IndexedDB
    if (updates.length > 0) {
      for (const product of updates) {
        try {
          await saveProduct(product, userId);
        } catch (err) {
          console.warn('[Pull] Failed to save product to IndexedDB:', product.id, err);
        }
      }

      // Reset to minimum interval since we found changes
      pullState.intervalMs = pullState.minInterval;
      pullState.noChangeCount = 0;
      console.log('[Pull] Changes detected, reset interval to', pullState.minInterval);
    } else {
      // No changes detected, increase interval
      pullState.noChangeCount++;

      if (pullState.noChangeCount >= pullState.maxNoChangeBeforeIncrease) {
        if (pullState.intervalMs < pullState.maxInterval) {
          pullState.intervalMs = Math.min(
            pullState.intervalMs + 10 * 60 * 1000, // Add 10 minutes
            pullState.maxInterval
          );
          console.log('[Pull] No changes detected, increased interval to', Math.round(pullState.intervalMs / 1000), 'seconds');
          pullState.noChangeCount = 0; // Reset counter after increase
        }
      }
    }

    pullState.lastPullTime = now;

    // Only trigger low stock notification check if we found product updates
    // This avoids unnecessary notifications on every sync cycle
    if (updates.length > 0) {
      console.log('[Pull] Triggering low stock notification check for', updates.length, 'product updates');
      sendLowStockNotificationForUser(firestore, userId, 10).catch(error => {
        console.warn('[Pull] Low stock notification check failed:', error);
      });
    } else {
      console.log('[Pull] No product updates found, skipping low stock check');
    }
  } catch (err) {
    console.error('[Pull] Error fetching changes:', err);
    // Continue trying on next interval
  }
}

/**
 * Get current pull state
 */
export function getPullState(): Readonly<PullState> {
  return { ...pullState };
}
