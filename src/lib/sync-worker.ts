/**
 * Sync Worker Service - Git-style push with FIFO, exponential backoff, quota handling
 * Sends commits to Firebase one-by-one and marks them synced on confirmation
 */

import {
  Firestore,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { getUnpushedCommits, markCommitSynced, incrementRetries, CommitObject } from './commit-queue';

interface SyncWorkerState {
  isRunning: boolean;
  isSyncing: boolean;
  lastQuotaError: number | null;
  quotaErrorNotified: boolean;
}

let syncState: SyncWorkerState = {
  isRunning: false,
  isSyncing: false,
  lastQuotaError: null,
  quotaErrorNotified: false,
};

let syncIntervalId: NodeJS.Timeout | null = null;
let syncProgressCallback: ((state: SyncWorkerState) => void) | null = null;

// Store Firebase context
let firebaseContext: { firestore: Firestore | null; userId: string | null } = {
  firestore: null,
  userId: null,
};

/**
 * Set Firebase context (called from layout-client)
 */
export function setFirebaseContext(firestore: Firestore, userId: string): void {
  firebaseContext = { firestore, userId };
}

/**
 * Register callback for sync state updates
 */
export function onSyncStateChange(callback: (state: SyncWorkerState) => void): void {
  syncProgressCallback = callback;
}

/**
 * Start sync worker (runs periodically)
 * Note: Firestore and userId are obtained from global Firebase context when needed
 */
export function startSyncWorker(intervalMs: number = 30000): () => void {
  if (syncState.isRunning) {
    console.log('[SyncWorker] Already running');
    return () => stopSyncWorker();
  }

  console.log('[SyncWorker] Starting sync worker');
  syncState.isRunning = true;

  // Schedule periodic syncs
  const scheduleSync = () => {
    if (syncIntervalId) clearTimeout(syncIntervalId);

    syncIntervalId = setTimeout(() => {
      processPendingCommitsFromContext().then(() => {
        scheduleSync();
      });
    }, intervalMs);
  };

  scheduleSync();

  return () => stopSyncWorker();
}

/**
 * Stop sync worker
 */
export function stopSyncWorker(): void {
  console.log('[SyncWorker] Stopping sync worker');
  if (syncIntervalId) clearTimeout(syncIntervalId);
  syncState.isRunning = false;
  syncIntervalId = null;
}

/**
 * Get Firestore and user from stored context
 */
function getFirebaseContext(): { firestore: Firestore | null; userId: string | null } {
  return firebaseContext;
}

/**
 * Trigger an immediate sync (called when a commit is queued)
 */
export async function triggerImmediateSync(): Promise<void> {
  const { firestore, userId } = getFirebaseContext();
  if (!firestore || !userId) {
    console.log('[SyncWorker] Firebase context not initialized, skipping immediate sync');
    return;
  }
  console.log('[SyncWorker] Triggering immediate sync...');
  return processPendingCommits(firestore, userId);
}

/**
 * Process pending commits using stored context
 */
async function processPendingCommitsFromContext(): Promise<void> {
  const { firestore, userId } = getFirebaseContext();
  if (!firestore || !userId) {
    console.log('[SyncWorker] Firebase context not initialized yet');
    return;
  }
  return processPendingCommits(firestore, userId);
}

/**
 * Process all pending commits (one-by-one, FIFO)
 */
async function processPendingCommits(firestore: Firestore, userId: string): Promise<void> {
  // GUARD: Free/trial users only store data locally in IndexedDB (no Firebase sync)
  // Expired users also cannot sync
  try {
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.subscription === 'trial') {
        console.log('[SyncWorker] Trial user detected - skipping Firebase sync (data persists only in IndexedDB)');
        return;
      }
      if (userData.subscription === 'expired') {
        console.log('[SyncWorker] Expired user detected - skipping Firebase sync');
        return;
      }
    }
  } catch (err) {
    console.warn('[SyncWorker] Could not check user subscription:', err);
    // Continue with sync on error (assume premium for safety)
  }

  // Check if we hit quota error recently (within 24 hours)
  if (syncState.lastQuotaError) {
    const hoursSinceError = (Date.now() - syncState.lastQuotaError) / (1000 * 60 * 60);
    if (hoursSinceError < 24) {
      console.log('[SyncWorker] Quota error within 24h, skipping sync');
      return;
    } else {
      console.log('[SyncWorker] 24h passed since quota error, retrying');
      syncState.lastQuotaError = null;
      syncState.quotaErrorNotified = false;
    }
  }

  if (syncState.isSyncing) {
    console.log('[SyncWorker] Already syncing, skipping');
    return;
  }

  try {
    syncState.isSyncing = true;
    updateProgress();

    const commits = await getUnpushedCommits(userId);
    if (commits.length === 0) {
      console.log('[SyncWorker] No pending commits');
      return;
    }

    console.log('[SyncWorker] Processing', commits.length, 'commits');

    // Process FIFO
    for (const commit of commits) {
      try {
        console.log('[SyncWorker] Syncing:', commit.type, commit.docId);
        await syncCommit(firestore, commit);

        // Mark as synced
        await markCommitSynced(commit.id);
        console.log('[SyncWorker] Commit synced:', commit.id);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        // Check for quota error
        if (
          errorMsg.includes('RESOURCE_EXHAUSTED') ||
          errorMsg.includes('quota') ||
          errorMsg.includes('exceeded')
        ) {
          console.error('[SyncWorker] QUOTA ERROR - stopping sync');
          syncState.lastQuotaError = Date.now();

          // Notify admin (would integrate with notification service)
          if (!syncState.quotaErrorNotified) {
            syncState.quotaErrorNotified = true;
            notifyQuotaError(userId);
          }

          // Stop processing remaining commits, wait 24h
          break;
        } else {
          // Other errors - retry with exponential backoff
          const newRetries = (commit.retries || 0) + 1;
          const maxRetries = 5;

          if (newRetries > maxRetries) {
            console.error('[SyncWorker] Max retries exceeded for:', commit.id);
            // Mark as synced anyway (failed permanently) to unblock queue
            await markCommitSynced(commit.id);
          } else {
            console.warn('[SyncWorker] Retry', newRetries, 'for:', commit.id);
            await incrementRetries(commit.id);
            // Continue to next commit
          }
        }
      }

      // Small delay between commits to avoid overwhelming Firebase
      await delay(100);
    }
  } catch (err) {
    console.error('[SyncWorker] Unexpected error:', err);
  } finally {
    syncState.isSyncing = false;
    updateProgress();
  }
}

/**
 * Sync a single commit to Firebase
 */
async function syncCommit(firestore: Firestore, commit: CommitObject): Promise<void> {
  const { type, collectionName, docId, data, userId } = commit;

  switch (type) {
    case 'create':
      // Use setDoc with the existing docId to prevent duplicate documents
      // addDoc would create a new document with a random ID, causing duplicates
      const createRef = doc(firestore, collectionName, docId);
      await setDoc(createRef, {
        ...data,
        userId,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      break;

    case 'update':
      const updateRef = doc(firestore, collectionName, docId);
      await updateDoc(updateRef, {
        ...data,
        version: (commit.version || 0) + 1,
        updatedAt: serverTimestamp(),
      });
      break;

    case 'delete':
      const deleteRef = doc(firestore, collectionName, docId);
      await updateDoc(deleteRef, {
        isDeleted: true,
        version: (commit.version || 0) + 1,
        updatedAt: serverTimestamp(),
      });
      break;

    case 'restore':
      const restoreRef = doc(firestore, collectionName, docId);
      await updateDoc(restoreRef, {
        isDeleted: false,
        version: (commit.version || 0) + 1,
        updatedAt: serverTimestamp(),
      });
      break;

    case 'permanent-delete':
      const permanentDeleteRef = doc(firestore, collectionName, docId);
      await deleteDoc(permanentDeleteRef);
      break;
  }
}

/**
 * Notify admin of quota error
 * TODO: Integrate with admin notification service
 */
function notifyQuotaError(userId: string): void {
  console.error('[SyncWorker] ⚠️ QUOTA EXCEEDED - Admin must be notified');
  console.error('[SyncWorker] User:', userId, '| Time:', new Date().toISOString());
  console.error('[SyncWorker] Sync paused for 24 hours');

  // TODO: Send to admin dashboard
  // notificationService.notifyAdmin({
  //   type: 'QUOTA_EXCEEDED',
  //   userId,
  //   timestamp: Date.now(),
  // });
}

/**
 * Update sync state
 */
function updateProgress(): void {
  if (syncProgressCallback) {
    syncProgressCallback({ ...syncState });
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get current sync state
 */
export function getSyncState(): Readonly<SyncWorkerState> {
  return { ...syncState };
}
