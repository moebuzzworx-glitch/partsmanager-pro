/**
 * Hybrid Import v2 - Git-style local-first import
 * Uses commit queue instead of Firebase API
 * Saves to IndexedDB instantly, queues for Firebase sync
 */

import { User } from 'firebase/auth';
import { queueCommit } from './commit-queue';
import { saveProduct, initDB, deleteProduct, updateProduct, getProductByReference, getProduct } from './indexeddb';
import { onUserActivity } from './pull-service';
import { triggerImmediateSync } from './sync-worker';

export interface ImportResult {
  total: number;
  localSaved: number;
  queued: number;
  errors: string[];
}

/**
 * Import products - Git-style: Local first, sync in background
 */
export async function hybridImportProducts(
  user: User | null,
  products: any[],
  onLocalProgress?: (progress: number, message: string) => void,
  onFirebaseProgress?: (progress: number, message: string) => void,
  currentProducts: any[] = []
): Promise<ImportResult> {
  if (!user) {
    throw new Error('User not authenticated');
  }

  const result: ImportResult = {
    total: products.length,
    localSaved: 0,
    queued: 0,
    errors: [],
  };

  try {
    console.log('[HybridImport] Starting import for', products.length, 'products');

    // Initialize IndexedDB
    await initDB();

    // STEP 1: Save to IndexedDB instantly (user sees products immediately)
    // Check for existing products by reference to prevent duplicates
    console.log('[HybridImport] STEP 1: Saving to IndexedDB (checking for duplicates)...');

    const productsWithIds: any[] = [];
    const updateOperations: any[] = []; // Track which products are updates vs creates

    for (let index = 0; index < products.length; index++) {
      const product = products[index];

      // Check if product with same reference already exists
      let existingProduct = null;
      if (product.reference) {
        // 1. Check in-memory products (most up-to-date from UI)
        existingProduct = currentProducts.find(p => p.reference === product.reference) || null;

        // 2. Fallback to IndexedDB check
        if (!existingProduct) {
          existingProduct = await getProductByReference(product.reference, user.uid);
        }
      }

      if (existingProduct) {
        // UPDATE existing product (prevent duplicates)
        // ACCUMULATE STOCK: existing + new
        const existingStock = Number(existingProduct.stock) || 0;
        const incomingStock = Number(product.stock) || 0;
        const newStock = existingStock + incomingStock;

        console.log('[HybridImport] Found existing product with reference:', product.reference, '- will UPDATE. Stock:', existingStock, '+', incomingStock, '=', newStock);

        productsWithIds.push({
          ...existingProduct, // Keep existing data
          ...product, // Apply new data on top
          stock: newStock, // Override stock with accumulated value
          id: existingProduct.id, // Keep original ID
          version: (existingProduct.version || 0) + 1,
          updatedAt: Date.now(),
        });
        updateOperations.push({ isUpdate: true, existingId: existingProduct.id });
      } else {
        // CREATE new product
        productsWithIds.push({
          id: product.id || `product-${Date.now()}-${index}`,
          ...product,
          version: 1,
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: Date.now(),
        });
        updateOperations.push({ isUpdate: false });
      }
    }

    const batchSize = 50;
    for (let i = 0; i < productsWithIds.length; i += batchSize) {
      const batch = productsWithIds.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          await saveProduct(product, user.uid);
          result.localSaved++;
        } catch (err) {
          console.error('[HybridImport] Failed to save product locally:', product.id, err);
          result.errors.push(`Failed to save ${product.id} locally: ${err}`);
        }
      }

      const progressPercent = Math.round((result.localSaved / products.length) * 100);
      onLocalProgress?.(progressPercent, `Saved ${result.localSaved}/${products.length} products locally`);
    }

    console.log('[HybridImport] STEP 1 Complete: Saved', result.localSaved, 'products to IndexedDB');
    onLocalProgress?.(100, `✅ Saved ${result.localSaved} products locally!`);

    // STEP 2: Queue for Firebase sync in background (fire and forget)
    console.log('[HybridImport] STEP 2: Queuing for Firebase sync...');

    for (let i = 0; i < productsWithIds.length; i++) {
      const product = productsWithIds[i];
      const operation = updateOperations[i];

      try {
        // Use 'update' for existing products, 'create' for new ones
        const commitType = operation.isUpdate ? 'update' : 'create';
        await queueCommit(commitType, 'products', product.id, product, user.uid);
        result.queued++;
        console.log(`[HybridImport] Queued ${commitType} for:`, product.id);
      } catch (err) {
        console.error('[HybridImport] Failed to queue product:', product.id, err);
        result.errors.push(`Failed to queue ${product.id} for sync: ${err}`);
      }
    }

    console.log('[HybridImport] STEP 2 Complete: Queued', result.queued, 'products for sync');

    // Trigger immediate sync in background (fire-and-forget, don't block user)
    triggerImmediateSync().catch(err => {
      console.error('[HybridImport] Background sync error:', err);
    });
    console.log('[HybridImport] Triggered background sync');

    // Trigger pull service interval reset on data addition
    onUserActivity('add');

    return result;
  } catch (error) {
    console.error('[HybridImport] Import failed:', error);
    throw error;
  }
}

/**
 * Update a product - Local first, then queue for sync
 */
export async function hybridUpdateProduct(
  user: User | null,
  productId: string,
  updates: any
): Promise<void> {
  if (!user) throw new Error('User not authenticated');

  try {
    console.log('[HybridImport] Updating product locally:', productId);

    // Save update to IndexedDB immediately
    const updatedProduct = {
      ...updates,
      id: productId,
      version: (updates.version || 0) + 1,
      updatedAt: Date.now(),
    };

    await saveProduct(updatedProduct, user.uid);
    console.log('[HybridImport] Product updated in IndexedDB:', productId);

    // Queue for Firebase sync
    await queueCommit('update', 'products', productId, updates, user.uid);
    console.log('[HybridImport] Product queued for sync:', productId);

    // Trigger immediate sync in background (fire-and-forget, don't block user)
    triggerImmediateSync().catch(err => {
      console.error('[HybridImport] Background sync error:', err);
    });
    console.log('[HybridImport] Triggered background sync');

    // Trigger pull service interval reset on data modification
    onUserActivity('edit');
  } catch (err) {
    console.error('[HybridImport] Failed to update product:', err);
    throw err;
  }
}

/**
 * Delete a product - Soft delete (mark as deleted locally, queue for sync)
 */
export async function hybridDeleteProduct(
  user: User | null,
  productId: string
): Promise<void> {
  if (!user) throw new Error('User not authenticated');

  try {
    console.log('[HybridImport] Soft-deleting product:', productId);

    // Mark as deleted in IndexedDB immediately using MERGE (preserves existing data)
    // This is critical - we use updateProduct instead of saveProduct to preserve
    // all product fields (name, price, stock, etc.) while only setting isDeleted=true
    await updateProduct(productId, {
      isDeleted: true,
      deletedAt: Date.now(),
    }, user.uid);
    console.log('[HybridImport] Product marked as deleted in IndexedDB (data preserved):', productId);

    // Queue delete commit for Firebase
    await queueCommit('delete', 'products', productId, { isDeleted: true }, user.uid);
    console.log('[HybridImport] Product queued for deletion sync:', productId);

    // Trigger immediate sync in background (fire-and-forget, don't block user)
    triggerImmediateSync().catch(err => {
      console.error('[HybridImport] Background sync error:', err);
    });
    console.log('[HybridImport] Triggered background sync');

    onUserActivity('delete');
  } catch (err) {
    console.error('[HybridImport] Failed to delete product:', err);
    throw err;
  }
}

/**
 * Restore a product - Undo soft delete (before or after sync)
 */
export async function hybridRestoreProduct(
  user: User | null,
  productId: string,
  productData: any
): Promise<void> {
  if (!user) throw new Error('User not authenticated');

  try {
    console.log('[HybridImport] Restoring product:', productId);

    // Restore in IndexedDB immediately
    const restoredProduct = {
      ...productData,
      id: productId,
      isDeleted: false,
      version: (productData.version || 0) + 1,
      updatedAt: Date.now(),
    };

    await saveProduct(restoredProduct, user.uid);
    console.log('[HybridImport] Product restored in IndexedDB:', productId);

    // If there's a pending delete in the queue, replace it with restore
    // Otherwise queue a new restore commit
    await queueCommit('restore', 'products', productId, restoredProduct, user.uid);
    console.log('[HybridImport] Product queued for restore sync:', productId);

    // Trigger immediate sync in background (fire-and-forget, don't block user)
    triggerImmediateSync().catch(err => {
      console.error('[HybridImport] Background sync error:', err);
    });
    console.log('[HybridImport] Triggered background sync');

    onUserActivity('edit');
  } catch (err) {
    console.error('[HybridImport] Failed to restore product:', err);
    throw err;
  }
}

/**
 * Permanently delete a product - Actually remove from Firebase (not soft delete)
 * Used when user permanently deletes from trash
 */
export async function hybridPermanentlyDeleteProduct(
  user: User | null,
  productId: string
): Promise<void> {
  if (!user) throw new Error('User not authenticated');

  try {
    console.log('[HybridImport] Permanently deleting product:', productId);

    // STEP 1: Delete from IndexedDB immediately (local-first)
    await deleteProduct(productId);
    console.log('[HybridImport] Product removed from IndexedDB:', productId);

    // STEP 2: Queue permanent delete commit for Firebase
    await queueCommit('permanent-delete', 'products', productId, {}, user.uid);
    console.log('[HybridImport] Product queued for permanent deletion:', productId);

    // STEP 3: Trigger immediate sync in background (fire-and-forget, don't block user)
    triggerImmediateSync().catch(err => {
      console.error('[HybridImport] Background sync error:', err);
    });
    console.log('[HybridImport] Triggered background sync');

    onUserActivity('delete');
  } catch (err) {
    console.error('[HybridImport] Failed to permanently delete product:', err);
    throw err;
  }
}
