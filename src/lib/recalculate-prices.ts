/**
 * Utility to recalculate selling prices for all products based on profit margin
 */

import { User } from 'firebase/auth';
import { Firestore, collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { getProductsByUser, saveProduct, initDB } from './indexeddb';
import { queueCommit } from './commit-queue';
import { triggerImmediateSync } from './sync-worker';

export interface RecalculateResult {
    total: number;
    updated: number;
    errors: string[];
}

/**
 * Recalculate selling prices for all products based on new profit margin
 * Formula: sellingPrice = purchasePrice * (1 + profitMargin / 100)
 * 
 * @param user - Firebase user
 * @param firestore - Firestore instance
 * @param profitMargin - New profit margin percentage (e.g., 25 for 25%)
 * @param onProgress - Optional progress callback
 */
export async function recalculateAllProductPrices(
    user: User | null,
    firestore: Firestore | null,
    profitMargin: number,
    onProgress?: (progress: number, message: string) => void
): Promise<RecalculateResult> {
    if (!user) {
        throw new Error('User not authenticated');
    }

    const result: RecalculateResult = {
        total: 0,
        updated: 0,
        errors: [],
    };

    try {
        console.log('[RecalculatePrices] Starting price recalculation with margin:', profitMargin, '%');
        onProgress?.(0, 'Loading products...');

        // Initialize IndexedDB
        await initDB();

        // Try to get products from Firebase first (most reliable source)
        let products: any[] = [];

        if (firestore) {
            try {
                console.log('[RecalculatePrices] Fetching products from Firebase...');
                const productsRef = collection(firestore, 'products');
                const q = query(productsRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);

                products = querySnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter((p: any) => p.isDeleted !== true);
                console.log('[RecalculatePrices] Fetched', products.length, 'products from Firebase');
            } catch (fbErr) {
                console.warn('[RecalculatePrices] Failed to fetch from Firebase, falling back to IndexedDB:', fbErr);
            }
        }

        // Fallback to IndexedDB if Firebase fetch failed or returned empty
        if (products.length === 0) {
            console.log('[RecalculatePrices] Fetching products from IndexedDB...');
            products = await getProductsByUser(user.uid);
            console.log('[RecalculatePrices] Fetched', products.length, 'products from IndexedDB');
        }

        result.total = products.length;

        if (products.length === 0) {
            onProgress?.(100, 'No products to update');
            return result;
        }

        console.log('[RecalculatePrices] Found', products.length, 'products to update');
        onProgress?.(10, `Found ${products.length} products...`);

        // Process products - update both IndexedDB and Firebase
        const batchSize = 50;

        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);

            // Create Firebase batch for this chunk
            let firebaseBatch = firestore ? writeBatch(firestore) : null;
            let batchCount = 0;

            for (const product of batch) {
                try {
                    const purchasePrice = Number(product.purchasePrice) || 0;

                    // Skip products with no purchase price
                    if (purchasePrice <= 0) {
                        console.log('[RecalculatePrices] Skipping product with no purchase price:', product.id);
                        continue;
                    }

                    // Calculate new selling price
                    const newPrice = purchasePrice * (1 + profitMargin / 100);

                    // Only update if price changed significantly
                    if (Math.abs(newPrice - (product.price || 0)) < 0.01) {
                        continue; // Skip if price is essentially the same
                    }

                    // Prepare updated product data
                    const updatedProduct = {
                        ...product,
                        price: newPrice,
                        version: (product.version || 0) + 1,
                        updatedAt: Date.now(),
                    };

                    // Update in IndexedDB (local-first)
                    await saveProduct(updatedProduct, user.uid);

                    // Update in Firebase directly (for immediate persistence)
                    if (firestore && firebaseBatch) {
                        const productRef = doc(firestore, 'products', product.id);
                        firebaseBatch.update(productRef, {
                            price: newPrice,
                            updatedAt: new Date(),
                        });
                        batchCount++;

                        // Firestore batches have a limit of 500 operations
                        if (batchCount >= 450) {
                            await firebaseBatch.commit();
                            console.log('[RecalculatePrices] Committed Firebase batch of', batchCount, 'updates');
                            firebaseBatch = writeBatch(firestore);
                            batchCount = 0;
                        }
                    }

                    result.updated++;
                } catch (err) {
                    console.error('[RecalculatePrices] Failed to update product:', product.id, err);
                    result.errors.push(`Failed to update ${product.name || product.id}: ${err}`);
                }
            }

            // Commit remaining Firebase batch
            if (firestore && firebaseBatch && batchCount > 0) {
                try {
                    await firebaseBatch.commit();
                    console.log('[RecalculatePrices] Committed final Firebase batch of', batchCount, 'updates');
                } catch (commitErr) {
                    console.error('[RecalculatePrices] Firebase batch commit failed:', commitErr);
                    result.errors.push(`Firebase batch commit failed: ${commitErr}`);
                }
            }

            const progressPercent = Math.round(((i + batch.length) / products.length) * 90) + 10;
            onProgress?.(progressPercent, `Updated ${result.updated} of ${products.length} products...`);
        }

        onProgress?.(100, `✅ Updated ${result.updated} product prices!`);
        console.log('[RecalculatePrices] Complete. Updated:', result.updated, '/', result.total);

        return result;
    } catch (error) {
        console.error('[RecalculatePrices] Failed:', error);
        throw error;
    }
}
