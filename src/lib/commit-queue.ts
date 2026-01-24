/**
 * Commit Queue Service - Git-like local change tracking
 * Manages pending changes before they're synced to Firebase
 */

export interface CommitObject {
  id: string;
  type: 'create' | 'update' | 'delete' | 'restore' | 'permanent-delete';
  collectionName: string;
  docId: string;
  timestamp: number;
  data: any;
  userId: string;
  synced: boolean;
  syncedAt?: number;
  version: number;
  retries?: number;
}

const COMMIT_STORE = 'commitQueue';

/**
 * Add a commit to the queue
 */
export async function queueCommit(
  type: CommitObject['type'],
  collectionName: string,
  docId: string,
  data: any,
  userId: string
): Promise<string> {
  const db = await getCommitDB();
  const tx = db.transaction(COMMIT_STORE, 'readwrite');
  const store = tx.objectStore(COMMIT_STORE);

  const commit: CommitObject = {
    id: `${collectionName}-${docId}-${Date.now()}`,
    type,
    collectionName,
    docId,
    timestamp: Date.now(),
    data,
    userId,
    synced: false,
    version: 1,
    retries: 0,
  };

  return new Promise((resolve, reject) => {
    const request = store.add(commit);
    request.onerror = () => {
      console.error('[CommitQueue] Error queuing commit:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      console.log('[CommitQueue] Queued', type, ':', docId);
      resolve(commit.id);
    };
  });
}

/**
 * Replace a delete commit with a restore commit (before sync)
 */
export async function replaceDeleteWithRestore(
  collectionName: string,
  docId: string,
  userId: string
): Promise<void> {
  const db = await getCommitDB();
  const tx = db.transaction(COMMIT_STORE, 'readwrite');
  const store = tx.objectStore(COMMIT_STORE);
  const index = store.index('docId');

  return new Promise((resolve, reject) => {
    const getAllRequest = index.getAll(docId);

    getAllRequest.onerror = () => {
      console.error('[CommitQueue] Error getting commits:', getAllRequest.error);
      reject(getAllRequest.error);
    };

    getAllRequest.onsuccess = () => {
      const commits = getAllRequest.result as CommitObject[];
      const deleteCommit = commits.find(
        (c) => c.type === 'delete' && c.collectionName === collectionName && !c.synced
      );

      if (deleteCommit) {
        console.log('[CommitQueue] Replacing delete with restore for:', docId);
        deleteCommit.type = 'restore';
        deleteCommit.timestamp = Date.now();
        deleteCommit.version++;

        const putRequest = store.put(deleteCommit);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        console.log('[CommitQueue] No pending delete found, queueing new restore');
        queueCommit('restore', collectionName, docId, {}, userId).then(() => resolve());
      }
    };
  });
}

/**
 * Get all unsynced commits for a user (FIFO)
 */
export async function getUnpushedCommits(userId: string): Promise<CommitObject[]> {
  const db = await getCommitDB();
  const tx = db.transaction(COMMIT_STORE, 'readonly');
  const store = tx.objectStore(COMMIT_STORE);

  return new Promise((resolve, reject) => {
    const allCommits: CommitObject[] = [];
    const request = store.getAll();

    request.onerror = () => {
      console.error('[CommitQueue] Error getting unpushed commits:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      try {
        const commits = request.result as CommitObject[];

        // Filter: synced === false, userId matches, and sort by timestamp (FIFO)
        const userCommits = commits
          .filter((c) => c.synced === false && c.userId === userId)
          .sort((a, b) => a.timestamp - b.timestamp);

        console.log('[CommitQueue] Found', userCommits.length, 'unpushed commits for user', userId);
        resolve(userCommits);
      } catch (err) {
        console.error('[CommitQueue] Error processing commits:', err);
        reject(err);
      }
    };

    tx.onerror = () => {
      console.error('[CommitQueue] Transaction error:', tx.error);
      reject(tx.error);
    };
  });
}

/**
 * Mark a commit as synced
 */
export async function markCommitSynced(commitId: string): Promise<void> {
  const db = await getCommitDB();
  const tx = db.transaction(COMMIT_STORE, 'readwrite');
  const store = tx.objectStore(COMMIT_STORE);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(commitId);

    getRequest.onerror = () => {
      console.error('[CommitQueue] Error getting commit:', getRequest.error);
      reject(getRequest.error);
    };

    getRequest.onsuccess = () => {
      const commit = getRequest.result as CommitObject;
      if (commit) {
        commit.synced = true;
        commit.syncedAt = Date.now();

        const putRequest = store.put(commit);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          console.log('[CommitQueue] Marked synced:', commitId);
          resolve();
        };
      } else {
        reject(new Error('Commit not found: ' + commitId));
      }
    };
  });
}

/**
 * Increment retry count for failed commit
 */
export async function incrementRetries(commitId: string): Promise<void> {
  const db = await getCommitDB();
  const tx = db.transaction(COMMIT_STORE, 'readwrite');
  const store = tx.objectStore(COMMIT_STORE);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(commitId);

    getRequest.onsuccess = () => {
      const commit = getRequest.result as CommitObject;
      if (commit) {
        commit.retries = (commit.retries || 0) + 1;
        const putRequest = store.put(commit);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        reject(new Error('Commit not found'));
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Cleanup old synced commits from IndexedDB to prevent storage bloat
 * Removes commits that were synced more than the specified time ago
 * @param olderThanMs - Remove commits synced longer than this (default: 24 hours)
 * @returns Number of commits removed
 */
export async function cleanupSyncedCommits(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const db = await getCommitDB();
  const tx = db.transaction(COMMIT_STORE, 'readwrite');
  const store = tx.objectStore(COMMIT_STORE);
  const cutoff = Date.now() - olderThanMs;

  return new Promise((resolve, reject) => {
    let removed = 0;
    const request = store.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const commit = cursor.value as CommitObject;
        // Remove synced commits older than cutoff
        if (commit.synced && commit.syncedAt && commit.syncedAt < cutoff) {
          cursor.delete();
          removed++;
        }
        cursor.continue();
      } else {
        if (removed > 0) {
          console.log('[CommitQueue] Cleaned up', removed, 'old synced commits');
        }
        resolve(removed);
      }
    };
  });
}

/**
 * Get or initialize commit queue database
 */
async function getCommitDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CommitQueueDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(COMMIT_STORE)) {
        const store = db.createObjectStore(COMMIT_STORE, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('docId', 'docId', { unique: false });
        console.log('[CommitQueue] Initialized commit queue database');
      }
    };
  });
}
