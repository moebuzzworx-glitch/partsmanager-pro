import { Firestore, doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

/**
 * Move product(s) to trash (soft delete)
 * @param firestore - Firestore instance
 * @param productIds - Single product ID or array of product IDs to move to trash
 * @returns true if successful, false otherwise
 */
export async function moveToTrash(
  firestore: Firestore,
  productIds: string | string[]
): Promise<boolean> {
  try {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    
    for (const productId of ids) {
      const productRef = doc(firestore, 'products', productId);
      await updateDoc(productRef, {
        deletedAt: new Date(),
        isDeleted: true,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error moving to trash:', error);
    return false;
  }
}

/**
 * Restore product(s) from trash
 * @param firestore - Firestore instance
 * @param productIds - Single product ID or array of product IDs to restore
 * @returns true if successful, false otherwise
 */
export async function restoreFromTrash(
  firestore: Firestore,
  productIds: string | string[]
): Promise<boolean> {
  try {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    
    for (const productId of ids) {
      const productRef = doc(firestore, 'products', productId);
      await updateDoc(productRef, {
        deletedAt: null,
        isDeleted: false,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error restoring from trash:', error);
    return false;
  }
}

/**
 * Permanently delete product(s)
 * @param firestore - Firestore instance
 * @param productIds - Single product ID or array of product IDs to permanently delete
 * @returns true if successful, false otherwise
 */
export async function permanentlyDelete(
  firestore: Firestore,
  productIds: string | string[]
): Promise<boolean> {
  try {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    
    for (const productId of ids) {
      const productRef = doc(firestore, 'products', productId);
      await deleteDoc(productRef);
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

