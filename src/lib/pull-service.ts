/**
 * Pull Service - Adaptive polling for Firebase changes
 * Increases interval when no changes, resets on user activity
 */

import { Firestore, collection, getDocs, query, where } from 'firebase/firestore';
import { saveProduct } from './indexeddb';

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

/**
 * Start adaptive pull service
 */
export function startPullService(firestore: Firestore, userId: string): () => void {
  if (pullState.isRunning) {
    console.log('[Pull] Service already running');
    return () => stopPullService();
  }

  console.log('[Pull] Starting adaptive pull service');
  pullState.isRunning = true;

  // Initial pull
  pullFirebaseChanges(firestore, userId);

  // Schedule periodic pulls
  const schedulePull = () => {
    if (pullIntervalId) clearTimeout(pullIntervalId);

    pullIntervalId = setTimeout(() => {
      pullFirebaseChanges(firestore, userId).then(() => {
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
 * Reset to minimum interval on user activity
 */
export function onUserActivity(): void {
  console.log('[Pull] User activity detected, resetting poll interval to', pullState.minInterval);
  pullState.intervalMs = pullState.minInterval;
  pullState.noChangeCount = 0;
}

/**
 * Fetch changes from Firebase
 */
async function pullFirebaseChanges(firestore: Firestore, userId: string): Promise<void> {
  console.log('[Pull] Pulling changes from Firebase');

  try {
    const lastPull = pullState.lastPullTime;
    const now = Date.now();

    // Query products updated after last pull
    const productsRef = collection(firestore, 'products');
    const q = query(
      productsRef,
      where('userId', '==', userId),
      where('updatedAt', '>', lastPull || 0)
    );

    const snapshot = await getDocs(q);
    const updates: any[] = [];

    snapshot.forEach((doc) => {
      updates.push({
        id: doc.id,
        ...doc.data(),
      });
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
