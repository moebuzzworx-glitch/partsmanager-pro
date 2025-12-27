import { Firestore, doc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

/**
 * Move product(s) to trash (soft delete) - OPTIMIZED with batch operations and progress tracking
 * @param firestore - Firestore instance
 * @param productIds - Single product ID or array of product IDs to move to trash
 * @param onProgress - Optional callback to track progress (0-100)
 * @returns true if successful, false otherwise
 */
export async function moveToTrash(
  firestore: Firestore,
  productIds: string | string[],
  onProgress?: (progress: number) => void
): Promise<boolean> {
  try {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    
    if (ids.length === 0) return true;

    let batch = writeBatch(firestore);
    let batchCount = 0;
    const BATCH_LIMIT = 500;
    let processedCount = 0;

    for (const productId of ids) {
      const productRef = doc(firestore, 'products', productId);
      batch.update(productRef, {
        deletedAt: new Date(),
        isDeleted: true,
      });

      batchCount++;
      processedCount++;

      // Report progress
      if (onProgress) {
        const progress = Math.min(Math.round((processedCount / ids.length) * 100), 100);
        onProgress(progress);
      }

      // Commit batch when reaching limit and create new one
      if (batchCount === BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(firestore);
        batchCount = 0;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // Final progress update
    if (onProgress) {
      onProgress(100);
    }
    
    return true;
  } catch (error) {
    console.error('Error moving to trash:', error);
    return false;
  }
}

/**
 * Restore product(s) from trash - OPTIMIZED with batch operations and progress tracking
 * @param firestore - Firestore instance
 * @param productIds - Single product ID or array of product IDs to restore
 * @param onProgress - Optional callback to track progress (0-100)
 * @returns true if successful, false otherwise
 */
export async function restoreFromTrash(
  firestore: Firestore,
  productIds: string | string[],
  onProgress?: (progress: number) => void
): Promise<boolean> {
  try {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    
    if (ids.length === 0) return true;

    let batch = writeBatch(firestore);
    let batchCount = 0;
    const BATCH_LIMIT = 500;
    let processedCount = 0;

    for (const productId of ids) {
      const productRef = doc(firestore, 'products', productId);
      batch.update(productRef, {
        deletedAt: null,
        isDeleted: false,
      });

      batchCount++;
      processedCount++;

      // Report progress
      if (onProgress) {
        const progress = Math.min(Math.round((processedCount / ids.length) * 100), 100);
        onProgress(progress);
      }

      // Commit batch when reaching limit and create new one
      if (batchCount === BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(firestore);
        batchCount = 0;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // Final progress update
    if (onProgress) {
      onProgress(100);
    }
    
    return true;
  } catch (error) {
    console.error('Error restoring from trash:', error);
    return false;
  }
}

/**
 * Permanently delete product(s) - OPTIMIZED with batch operations and progress tracking
 * @param firestore - Firestore instance
 * @param productIds - Single product ID or array of product IDs to permanently delete
 * @param onProgress - Optional callback to track progress (0-100)
 * @returns true if successful, false otherwise
 */
export async function permanentlyDelete(
  firestore: Firestore,
  productIds: string | string[],
  onProgress?: (progress: number) => void
): Promise<boolean> {
  try {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    
    if (ids.length === 0) return true;

    let batch = writeBatch(firestore);
    let batchCount = 0;
    const BATCH_LIMIT = 500;
    let processedCount = 0;

    for (const productId of ids) {
      const productRef = doc(firestore, 'products', productId);
      batch.delete(productRef);

      batchCount++;
      processedCount++;

      // Report progress
      if (onProgress) {
        const progress = Math.min(Math.round((processedCount / ids.length) * 100), 100);
        onProgress(progress);
      }

      // Commit batch when reaching limit and create new one
      if (batchCount === BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(firestore);
        batchCount = 0;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // Final progress update
    if (onProgress) {
      onProgress(100);
    }
    
    return true;
  } catch (error) {
    console.error('Error permanently deleting:', error);
    return false;
  }
}

/**
 * Get all deleted products from trash
 * @param firestore - Firestore instance
 * @returns Array of deleted products
 */
export async function getDeletedProducts(firestore: Firestore): Promise<any[]> {
  try {
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef, where('isDeleted', '==', true));
    const querySnapshot = await getDocs(q);
    
    const deletedProducts: any[] = [];
    querySnapshot.forEach((doc) => {
      deletedProducts.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return deletedProducts;
  } catch (error) {
    console.error('Error fetching deleted products:', error);
    return [];
  }
}

/**
 * Get all active (not deleted) products
 * @param firestore - Firestore instance
 * @returns Array of active products
 */
export async function getActiveProducts(firestore: Firestore): Promise<any[]> {
  try {
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef, where('isDeleted', '==', false));
    const querySnapshot = await getDocs(q);
    
    const activeProducts: any[] = [];
    querySnapshot.forEach((doc) => {
      activeProducts.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return activeProducts;
  } catch (error) {
    console.error('Error fetching active products:', error);
    return [];
  }
}

/**
 * Migrate all products to ensure they have the isDeleted field
 * Sets isDeleted=false for any products missing this field
 * @param firestore - Firestore instance
 * @returns Number of products updated
 */
export async function ensureAllProductsHaveDeletedField(firestore: Firestore): Promise<number> {
  try {
    const productsRef = collection(firestore, 'products');
    const allDocsQuery = query(productsRef);
    const querySnapshot = await getDocs(allDocsQuery);
    
    let updateCount = 0;
    const batch = writeBatch(firestore);

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // If isDeleted field is missing, add it with value false
      if (!('isDeleted' in data)) {
        batch.update(docSnap.ref, { isDeleted: false });
        updateCount++;
      }
    });

    // Commit batch if there are updates
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Migrated ${updateCount} products to have isDeleted field`);
    }

    return updateCount;
  } catch (error) {
    console.error('Error migrating products:', error);
    return 0;
  }
}

