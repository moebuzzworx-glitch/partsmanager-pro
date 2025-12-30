/**
 * Hybrid import service - saves to IndexedDB first, then syncs to Firebase
 * Provides instant feedback to user while syncing in background
 */

import { User } from 'firebase/auth';
import { saveProductsBatch, addToSyncQueue, initDB } from './indexeddb';
import { importProductsViaAPI } from './api-bulk-operations';

interface ImportResult {
  success: boolean;
  localSaved: number;
  firebaseSynced: number;
  message: string;
  error?: string;
}

/**
 * Hybrid import: Save to IndexedDB first (instant), sync to Firebase in background
 * This provides immediate feedback to user and works offline
 */
export async function hybridImportProducts(
  user: User | null,
  products: any[],
  onLocalProgress?: (progress: number, message: string) => void,
  onFirebaseProgress?: (progress: number, message: string) => void
): Promise<ImportResult> {
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // Initialize IndexedDB
    await initDB();

    // STEP 1: Save to IndexedDB (instant)
    const localStartTime = Date.now();
    onLocalProgress?.(0, 'Saving to local storage...');

    const batchSize = 100;
    let localSaved = 0;

    // Add IDs to products before saving
    const productsWithIds = products.map((product, index) => ({
      id: product.id || `product-${Date.now()}-${index}`,
      ...product,
    }));

    for (let i = 0; i < productsWithIds.length; i += batchSize) {
      const batch = productsWithIds.slice(i, i + batchSize);
      const saved = await saveProductsBatch(batch, user.uid);
      localSaved += saved;

      const progressPercent = Math.round((localSaved / productsWithIds.length) * 100);
      onLocalProgress?.(progressPercent, `Saved ${localSaved}/${productsWithIds.length} to local storage`);
    }

    const localTime = Date.now() - localStartTime;
    console.log(`✅ Saved ${localSaved} products to IndexedDB in ${localTime}ms`);

    // Tell user it's saved locally
    onLocalProgress?.(100, `✅ Saved ${localSaved} products locally!`);

    // STEP 2: Sync to Firebase in background (async, doesn't block UI)
    onFirebaseProgress?.(0, 'Syncing to cloud...');

    let firebaseSynced = 0;
    let firebaseError: string | undefined;

    try {
      const result = await importProductsViaAPI(user, products, (progress: number) => {
        onFirebaseProgress?.(progress, `Syncing to cloud... ${Math.round(progress)}%`);
      });

      if (result.success) {
        firebaseSynced = result.processed;
        console.log(`✅ Synced ${firebaseSynced} products to Firebase`);
      } else {
        firebaseError = result.error || result.message;
        console.warn(`⚠️ Firebase sync incomplete: ${firebaseError}`);
      }
    } catch (firebaseErr) {
      firebaseError = firebaseErr instanceof Error ? firebaseErr.message : 'Unknown error';
      console.warn(`⚠️ Firebase sync failed: ${firebaseError} (but data saved locally)`);
    }

    onFirebaseProgress?.(100, 'Sync complete');

    return {
      success: true,
      localSaved,
      firebaseSynced,
      message: `Imported ${localSaved} products locally${firebaseSynced > 0 ? ` and synced ${firebaseSynced} to cloud` : ''}${firebaseError ? ` (Cloud sync incomplete: ${firebaseError})` : ''}`,
      error: firebaseError,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    console.error('Hybrid import error:', error);
    throw new Error(message);
  }
}

/**
 * Import products with queue for offline sync
 * Better for very large imports that might take time
 */
export async function queuedImportProducts(
  user: User | null,
  products: any[],
  onProgress?: (progress: number, message: string) => void
): Promise<ImportResult> {
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    await initDB();

    onProgress?.(0, `Queuing ${products.length} products for import...`);

    const batchSize = 100;
    let queuedCount = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      for (const product of batch) {
        // Add to sync queue instead of direct save
        await addToSyncQueue(
          'products',
          `batch-${Date.now()}-${Math.random()}`,
          'create',
          product,
          user.uid
        );
        queuedCount++;
      }

      const progressPercent = Math.round((queuedCount / products.length) * 100);
      onProgress?.(progressPercent, `Queued ${queuedCount}/${products.length} for sync`);
    }

    onProgress?.(100, `All ${queuedCount} products queued for sync`);

    return {
      success: true,
      localSaved: queuedCount,
      firebaseSynced: 0,
      message: `Queued ${queuedCount} products for import. Will sync when online.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Queue failed';
    throw new Error(message);
  }
}
