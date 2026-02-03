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

        // Get all products from IndexedDB
        const products = await getProductsByUser(user.uid);
        result.total = products.length;

        if (products.length === 0) {
            onProgress?.(100, 'No products to update');
            return result;
        }

        console.log('[RecalculatePrices] Found', products.length, 'products to update');
        onProgress?.(10, `Found ${products.length} products...`);

        // Process products in batches
        const batchSize = 50;
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);

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

                    // Only update if price changed
                    if (Math.abs(newPrice - (product.price || 0)) < 0.01) {
                        continue; // Skip if price is essentially the same
                    }

                    // Update in IndexedDB
                    const updatedProduct = {
                        ...product,
                        price: newPrice,
                        version: (product.version || 0) + 1,
                        updatedAt: Date.now(),
                    };

                    await saveProduct(updatedProduct, user.uid);

                    // Queue for Firebase sync
                    await queueCommit('update', 'products', product.id, updatedProduct, user.uid);

                    result.updated++;
                } catch (err) {
                    console.error('[RecalculatePrices] Failed to update product:', product.id, err);
                    result.errors.push(`Failed to update ${product.name || product.id}: ${err}`);
                }
            }

            const progressPercent = Math.round(((i + batch.length) / products.length) * 90) + 10;
            onProgress?.(progressPercent, `Updated ${result.updated} of ${products.length} products...`);
        }

        // Trigger background sync
        triggerImmediateSync().catch(err => {
            console.error('[RecalculatePrices] Background sync error:', err);
        });

        onProgress?.(100, `✅ Updated ${result.updated} product prices!`);
        console.log('[RecalculatePrices] Complete. Updated:', result.updated, '/', result.total);

        return result;
    } catch (error) {
        console.error('[RecalculatePrices] Failed:', error);
        throw error;
    }
}
