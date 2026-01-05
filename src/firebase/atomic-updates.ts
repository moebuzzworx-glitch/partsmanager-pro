
'use client';

import { 
    Firestore,
    collection,
    doc,
    runTransaction,
    serverTimestamp
} from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

/**
 * Creates a new product or updates the stock of an existing one atomically.
 * It finds an existing product by its `reference` field.
 *
 * @param firestore The Firestore instance.
 * @param newProductData The data for the product to be added or updated.
 * @param existingProducts The current list of products to search for a match.
 */
export async function addProductOrUpdateStock(
  firestore: Firestore,
  newProductData: Omit<Product, 'id'>,
  existingProducts: Product[]
): Promise<void> {
  // Logic only applies if a reference is provided. Otherwise, always create.
  if (newProductData.reference && newProductData.reference.trim() !== '') {
    const existingProduct = existingProducts.find(
      (p) => p.reference === newProductData.reference
    );

    if (existingProduct) {
      // Product with the same reference exists, update it in a transaction.
      const productRef = doc(firestore, 'products', existingProduct.id);

      try {
        await runTransaction(firestore, async (transaction) => {
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw new Error("Document does not exist!");
          }

          const currentStock = productDoc.data().stock || 0;
          const newStock = currentStock + newProductData.stock;
          const currentVersion = productDoc.data().version || 1;

          transaction.update(productRef, {
            stock: newStock,
            purchasePrice: newProductData.purchasePrice,
            price: newProductData.price, // Update selling price too
            version: currentVersion + 1,
            updatedAt: serverTimestamp()
          });
        });
      } catch (error: any) {
        console.error('Transaction failed: ', error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productRef.path,
            operation: 'update',
            requestResourceData: { stock: 'increment', purchasePrice: newProductData.purchasePrice }
        }));
        throw error; // Re-throw to be caught by the calling UI
      }
      return; // Stop execution after updating
    }
  }

  // If no reference is provided, or if no existing product is found, create a new one.
  const productsCollection = collection(firestore, 'products');
  const newDocRef = doc(productsCollection); // Create a new doc with a generated ID

  try {
    await runTransaction(firestore, async (transaction) => {
      transaction.set(newDocRef, { 
        ...newProductData, 
        version: 1,
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
      });
    });
  } catch (error: any) {
    console.error('Transaction failed: ', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: productsCollection.path,
        operation: 'create',
        requestResourceData: newProductData
    }));
    throw error;
  }
}
