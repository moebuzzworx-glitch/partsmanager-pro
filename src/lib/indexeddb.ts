/**
 * IndexedDB Service - Local storage layer for offline-first architecture
 * Stores products, customers, suppliers, invoices, and sync metadata
 */

interface SyncMetadata {
  id: string;
  collectionName: string;
  docId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  synced: boolean;
  attempts: number;
  userId: string;
}

const DB_NAME = 'StockManagerDB';
const DB_VERSION = 2; // Incremented to match existing database version


const STORES = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  INVOICES: 'invoices',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata',
};

/**
 * Initialize IndexedDB with all required stores
 */
export async function initDB(): Promise<IDBDatabase> {
  // getDB() now handles all initialization
  return getDB();
}

/**
 * Get database instance - ensures initialization
 */
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    console.log('[IndexedDB] getDB() called');
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Database open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[IndexedDB] Database opened successfully');
      const db = request.result;

      // Verify all stores exist
      console.log('[IndexedDB] Checking stores exist:', Array.from(db.objectStoreNames));
      let allStoresExist = true;
      for (const storeName of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn('[IndexedDB] Missing store:', storeName);
          allStoresExist = false;
          break;
        }
      }

      if (allStoresExist) {
        console.log('[IndexedDB] All stores exist, returning database');
        resolve(db);
      } else {
        console.warn('[IndexedDB] Some stores missing, need to upgrade');
        db.close();
        // Increment version to trigger upgrade
        const retryRequest = indexedDB.open(DB_NAME, DB_VERSION + 1);

        retryRequest.onerror = () => {
          console.error('[IndexedDB] Retry failed:', retryRequest.error);
          reject(retryRequest.error);
        };

        retryRequest.onsuccess = () => {
          console.log('[IndexedDB] Retry succeeded');
          resolve(retryRequest.result);
        };

        retryRequest.onupgradeneeded = (event) => {
          console.log('[IndexedDB] onupgradeneeded triggered during retry');
          initializeStores((event.target as IDBOpenDBRequest).result);
        };
      }
    };

    // Upgrade handler
    request.onupgradeneeded = (event) => {
      console.log('[IndexedDB] onupgradeneeded triggered');
      initializeStores((event.target as IDBOpenDBRequest).result);
    };
  });
}

/**
 * Initialize all stores (extracted to avoid duplication)
 */
function initializeStores(db: IDBDatabase) {
  console.log('[IndexedDB] Initializing stores');

  // Products store
  if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
    console.log('[IndexedDB] Creating products store');
    const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
    productStore.createIndex('userId', 'userId', { unique: false });
    productStore.createIndex('createdAt', 'createdAt', { unique: false });
  }

  // Customers store
  if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
    console.log('[IndexedDB] Creating customers store');
    const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
    customerStore.createIndex('userId', 'userId', { unique: false });
    customerStore.createIndex('createdAt', 'createdAt', { unique: false });
  }

  // Suppliers store
  if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
    console.log('[IndexedDB] Creating suppliers store');
    const supplierStore = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' });
    supplierStore.createIndex('userId', 'userId', { unique: false });
  }

  // Invoices store
  if (!db.objectStoreNames.contains(STORES.INVOICES)) {
    console.log('[IndexedDB] Creating invoices store');
    const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: 'id' });
    invoiceStore.createIndex('userId', 'userId', { unique: false });
    invoiceStore.createIndex('invoiceDate', 'invoiceDate', { unique: false });
  }

  // Sync queue (for offline changes)
  if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
    console.log('[IndexedDB] Creating syncQueue store');
    const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
    syncStore.createIndex('userId', 'userId', { unique: false });
    syncStore.createIndex('synced', 'synced', { unique: false });
    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
  }

  // Metadata store (last sync times, etc)
  if (!db.objectStoreNames.contains(STORES.METADATA)) {
    console.log('[IndexedDB] Creating metadata store');
    db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
  }

  console.log('[IndexedDB] All stores initialized');
}

/**
 * Save a single product to IndexedDB
 */
export async function saveProduct(product: any, userId: string): Promise<void> {
  console.log('[IndexedDB] saveProduct called for product:', product.id, 'user:', userId);
  const db = await getDB();
  console.log('[IndexedDB] Got database for saveProduct');
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORES.PRODUCTS);

  const productWithMeta = {
    ...product,
    userId,
    version: product.version || 1, // Track version for conflict resolution
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: product.updatedAt || Date.now(),
    isDeleted: product.isDeleted ?? false, // Ensure isDeleted is always set (default: false)
  };

  return new Promise((resolve, reject) => {
    const request = store.put(productWithMeta);
    request.onerror = () => {
      console.error('[IndexedDB] Error saving product:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      console.log('[IndexedDB] Product saved successfully:', product.id);

      // Wait for transaction to complete
      tx.oncomplete = () => {
        console.log('[IndexedDB] saveProduct transaction complete');
        resolve();
      };

      tx.onerror = () => {
        console.error('[IndexedDB] saveProduct transaction error:', tx.error);
        reject(tx.error);
      };
    };
  });
}

/**
 * Save multiple products in batch (for imports)
 */
export async function saveProductsBatch(products: any[], userId: string): Promise<number> {
  console.log('[IndexedDB] saveProductsBatch called with', products.length, 'products');
  const db = await getDB();
  console.log('[IndexedDB] Got database for batch');
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORES.PRODUCTS);

  let saved = 0;

  return new Promise((resolve, reject) => {
    products.forEach((product, idx) => {
      const productWithMeta = {
        ...product,
        userId,
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: product.isDeleted ?? false, // Ensure isDeleted is always set (default: false)
      };

      const request = store.put(productWithMeta);
      request.onsuccess = () => {
        saved++;
        console.log('[IndexedDB] Saved product', idx + 1, '/', products.length, 'ID:', product.id);
      };
      request.onerror = () => {
        console.error('[IndexedDB] Error saving product:', product.id, request.error);
      };
    });

    tx.oncomplete = () => {
      console.log('[IndexedDB] Batch save transaction complete, saved', saved, 'products');
      resolve(saved);
    };
    tx.onerror = () => {
      console.error('[IndexedDB] Batch save transaction error:', tx.error);
      reject(tx.error);
    };
  });
}

/**
 * Get all products for a user (INCLUDING deleted ones - raw data)
 * This matches Firebase behavior where we fetch everything and filter in the component
 */
export async function getAllProductsByUserRaw(userId: string): Promise<any[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readonly');
  const store = tx.objectStore(STORES.PRODUCTS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const items: any[] = [];
    const request = index.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const product = cursor.value;
        // Return ALL products for this user (including deleted ones)
        if (product.userId === userId) {
          items.push(product);
        }
        cursor.continue();
      } else {
        resolve(items);
      }
    };
  });
}

/**
 * Get all products for a user (excluding deleted ones)
 */
export async function getProductsByUser(userId: string): Promise<any[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readonly');
  const store = tx.objectStore(STORES.PRODUCTS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const items: any[] = [];
    const request = index.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const product = cursor.value;
        // Only return non-deleted products for this user
        if (product.userId === userId && product.isDeleted !== true) {
          items.push(product);
        }
        cursor.continue();
      } else {
        resolve(items);
      }
    };
  });
}

/**
 * Get IDs of products with pending delete operations (not yet synced)
 * These products should not be loaded to avoid conflicts on refresh
 */
export async function getPendingDeleteProductIds(userId: string): Promise<string[]> {
  try {
    const { getUnpushedCommits } = await import('./commit-queue');
    const commits = await getUnpushedCommits(userId);

    // Filter commits that are delete or permanent-delete operations for products
    return commits
      .filter((c) => (c.type === 'delete' || c.type === 'permanent-delete') && c.collectionName === 'products')
      .map((c) => c.docId);
  } catch (err) {
    console.warn('[IndexedDB] Failed to get pending deletes:', err);
    return []; // If there's an error, return empty list (don't block loading)
  }
}

/**
 * Get map of pending changes for products (docId -> changeType)
 * Used to correctly filter items in UI based on their pending state
 */
export async function getProductPendingChanges(userId: string): Promise<Map<string, 'delete' | 'restore' | 'permanent-delete' | 'create' | 'update'>> {
  try {
    const { getUnpushedCommits } = await import('./commit-queue');
    const commits = await getUnpushedCommits(userId);

    const changes = new Map<string, 'delete' | 'restore' | 'permanent-delete' | 'create' | 'update'>();

    // Process commits in order - later commits override earlier ones
    commits
      .filter((c) => c.collectionName === 'products')
      .forEach((c) => {
        changes.set(c.docId, c.type);
      });

    return changes;
  } catch (err) {
    console.warn('[IndexedDB] Failed to get pending changes:', err);
    return new Map();
  }
}

/**
 * Get products for a user excluding both deleted and pending-delete products
 * Use this when loading products for display to prevent conflicts
 */
export async function getProductsByUserExcludingPending(userId: string): Promise<any[]> {
  const products = await getProductsByUser(userId);
  const pendingDeleteIds = await getPendingDeleteProductIds(userId);

  // Filter out products that have pending delete operations
  return products.filter((product) => !pendingDeleteIds.includes(product.id));
}

/**
 * Get deleted products for a user (marked with isDeleted: true)
 * For trash page display, includes stock and price for restore purposes
 */
export async function getDeletedProductsByUser(userId: string): Promise<any[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readonly');
  const store = tx.objectStore(STORES.PRODUCTS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const items: any[] = [];
    const request = index.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const product = cursor.value;
        // Only return deleted products for this user
        if (product.userId === userId && product.isDeleted === true) {
          items.push(product);
        }
        cursor.continue();
      } else {
        resolve(items);
      }
    };
  });
}

/**
 * Remove all deleted products from IndexedDB for a user
 * (cleanup deleted items from cache so they don't keep appearing)
 */
export async function removeDeletedProductsFromCache(userId: string): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORES.PRODUCTS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    let removed = 0;
    const request = index.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const product = cursor.value;
        // Delete products that are marked as deleted
        if (product.userId === userId && product.isDeleted === true) {
          cursor.delete();
          removed++;
        }
        cursor.continue();
      } else {
        resolve(removed);
      }
    };
  });
}

/**
 * Get a single product
 */
export async function getProduct(productId: string): Promise<any | null> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readonly');
  const store = tx.objectStore(STORES.PRODUCTS);

  return new Promise((resolve, reject) => {
    const request = store.get(productId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORES.PRODUCTS);

  return new Promise((resolve, reject) => {
    const request = store.delete(productId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update a product with partial data (MERGE instead of REPLACE)
 * This preserves existing fields while only updating specified ones.
 * Critical for soft-delete operations where we only want to update isDeleted flag.
 */
export async function updateProduct(productId: string, updates: any, userId: string): Promise<void> {
  console.log('[IndexedDB] updateProduct called for:', productId, 'updates:', Object.keys(updates));
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORES.PRODUCTS);

  return new Promise((resolve, reject) => {
    // First, get existing product
    const getRequest = store.get(productId);

    getRequest.onerror = () => {
      console.error('[IndexedDB] Error getting product for update:', getRequest.error);
      reject(getRequest.error);
    };

    getRequest.onsuccess = () => {
      const existing = getRequest.result;

      let merged: any;
      if (existing) {
        // MERGE: Keep existing data, apply updates on top
        merged = {
          ...existing,
          ...updates,
          id: productId, // Ensure ID is preserved
          userId,
          version: (existing.version || 0) + 1,
          updatedAt: Date.now(),
        };
        console.log('[IndexedDB] Merging update with existing product, new version:', merged.version);
      } else {
        // Product doesn't exist, create new with updates
        merged = {
          ...updates,
          id: productId,
          userId,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: Date.now(),
          isDeleted: updates.isDeleted ?? false,
        };
        console.log('[IndexedDB] Creating new product from updates');
      }

      const putRequest = store.put(merged);

      putRequest.onerror = () => {
        console.error('[IndexedDB] Error saving merged product:', putRequest.error);
        reject(putRequest.error);
      };

      putRequest.onsuccess = () => {
        tx.oncomplete = () => {
          console.log('[IndexedDB] Product updated successfully:', productId);
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    };
  });
}

/**
 * Get a product by reference (SKU) for deduplication during imports
 * Returns the first matching product for the given user with the specified reference
 */
export async function getProductByReference(reference: string, userId: string): Promise<any | null> {
  if (!reference) return null;

  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readonly');
  const store = tx.objectStore(STORES.PRODUCTS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(userId));

    request.onerror = () => reject(request.error);
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const product = cursor.value;
        // Match by reference (SKU) - case-insensitive comparison
        if (product.reference && product.reference.toLowerCase() === reference.toLowerCase()) {
          resolve(product);
          return;
        }
        cursor.continue();
      } else {
        // No match found
        resolve(null);
      }
    };
  });
}

/**
 * Get all product IDs that have pending (unsynced) commits
 * Used to prevent pull service from overwriting local changes
 */
export async function getPendingCommitProductIds(userId: string): Promise<string[]> {
  try {
    const { getUnpushedCommits } = await import('./commit-queue');
    const commits = await getUnpushedCommits(userId);

    // Return ALL product IDs with any pending commits (not just deletes)
    return commits
      .filter((c) => c.collectionName === 'products')
      .map((c) => c.docId);
  } catch (err) {
    console.warn('[IndexedDB] Failed to get pending commits:', err);
    return [];
  }
}

/**
 * Save customer to IndexedDB
 */
export async function saveCustomer(customer: any, userId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.CUSTOMERS, 'readwrite');
  const store = tx.objectStore(STORES.CUSTOMERS);

  const customerWithMeta = {
    ...customer,
    userId,
    createdAt: customer.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const request = store.put(customerWithMeta);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all customers for a user
 */
export async function getCustomersByUser(userId: string): Promise<any[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.CUSTOMERS, 'readonly');
  const store = tx.objectStore(STORES.CUSTOMERS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(userId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Delete customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.CUSTOMERS, 'readwrite');
  const store = tx.objectStore(STORES.CUSTOMERS);

  return new Promise((resolve, reject) => {
    const request = store.delete(customerId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Save supplier
 */
export async function saveSupplier(supplier: any, userId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.SUPPLIERS, 'readwrite');
  const store = tx.objectStore(STORES.SUPPLIERS);

  const supplierWithMeta = {
    ...supplier,
    userId,
    createdAt: supplier.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const request = store.put(supplierWithMeta);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all suppliers for user
 */
export async function getSuppliersByUser(userId: string): Promise<any[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.SUPPLIERS, 'readonly');
  const store = tx.objectStore(STORES.SUPPLIERS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(userId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Delete supplier
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.SUPPLIERS, 'readwrite');
  const store = tx.objectStore(STORES.SUPPLIERS);

  return new Promise((resolve, reject) => {
    const request = store.delete(supplierId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Save invoice
 */
export async function saveInvoice(invoice: any, userId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.INVOICES, 'readwrite');
  const store = tx.objectStore(STORES.INVOICES);

  const invoiceWithMeta = {
    ...invoice,
    userId,
    createdAt: invoice.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const request = store.put(invoiceWithMeta);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all invoices for user
 */
export async function getInvoicesByUser(userId: string): Promise<any[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.INVOICES, 'readonly');
  const store = tx.objectStore(STORES.INVOICES);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(userId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Delete invoice
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.INVOICES, 'readwrite');
  const store = tx.objectStore(STORES.INVOICES);

  return new Promise((resolve, reject) => {
    const request = store.delete(invoiceId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Add item to sync queue (for offline changes)
 */
/**
 * @deprecated Use queueCommit from commit-queue.ts instead
 * Kept for backward compatibility during migration
 */
export async function addToSyncQueue(
  collectionName: string,
  docId: string,
  action: 'create' | 'update' | 'delete',
  data: any,
  userId: string
): Promise<number> {
  console.warn('[IndexedDB] ⚠️ addToSyncQueue is deprecated, use queueCommit from commit-queue.ts');

  try {
    const { queueCommit } = await import('./commit-queue');
    await queueCommit(action as any, collectionName, docId, data, userId);
    return 1; // Return dummy value for compatibility
  } catch (err) {
    console.error('[IndexedDB] Error in deprecated addToSyncQueue:', err);
    throw err;
  }
}

/**
 * @deprecated Use getUnpushedCommits from commit-queue.ts instead
 * Kept for backward compatibility during migration to Git-like sync
 * This function is no longer needed with the new commit-based sync system
 */
export async function getUnsyncedItems(userId: string): Promise<SyncMetadata[]> {
  console.warn('[IndexedDB] ⚠️ getUnsyncedItems is deprecated, use getUnpushedCommits from commit-queue.ts');

  try {
    const { getUnpushedCommits } = await import('./commit-queue');
    const commits = await getUnpushedCommits(userId);

    // Convert new CommitObject format to old SyncMetadata format for compatibility
    return commits.map((commit: any) => ({
      id: commit.id,
      collectionName: commit.collectionName,
      docId: commit.docId,
      action: commit.type,
      data: commit.data,
      timestamp: commit.timestamp,
      synced: commit.synced,
      attempts: commit.retries || 0,
      userId: commit.userId,
    }));
  } catch (err) {
    console.error('[IndexedDB] Error in deprecated getUnsyncedItems:', err);
    return []; // Return empty on error for backward compatibility
  }
}

/**
 * Mark queue item as synced
 */
export async function markAsSynced(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
  const store = tx.objectStore(STORES.SYNC_QUEUE);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.synced = true;
        const putRequest = store.put(item);
        putRequest.onsuccess = () => {
          // Make sure transaction completes
          tx.oncomplete = () => resolve();
        };
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        tx.oncomplete = () => resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete sync queue item
 */
export async function deleteSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
  const store = tx.objectStore(STORES.SYNC_QUEUE);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => {
      console.error('[IndexedDB] Error deleting sync queue item:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      console.log('[IndexedDB] Item deleted from queue, waiting for transaction...');
      // Wait for transaction to complete
      tx.oncomplete = () => {
        console.log('[IndexedDB] Transaction complete for delete queue item');
        resolve();
      };
      tx.onerror = () => {
        console.error('[IndexedDB] Transaction error:', tx.error);
        reject(tx.error);
      };
    };
  });
}

/**
 * Clear all data for a user (logout)
 */
export async function clearUserData(userId: string): Promise<void> {
  const db = await getDB();

  const collections = [
    STORES.PRODUCTS,
    STORES.CUSTOMERS,
    STORES.SUPPLIERS,
    STORES.INVOICES,
    STORES.SYNC_QUEUE,
  ];

  for (const collectionName of collections) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(collectionName, 'readwrite');
      const store = tx.objectStore(collectionName);
      const index = store.index('userId');

      const range = IDBKeyRange.only(userId);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/**
 * Get storage size used
 */
export async function getStorageSize(): Promise<{
  products: number;
  customers: number;
  suppliers: number;
  invoices: number;
  total: number;
}> {
  const [products, customers, suppliers, invoices] = await Promise.all([
    getCountInStore(STORES.PRODUCTS),
    getCountInStore(STORES.CUSTOMERS),
    getCountInStore(STORES.SUPPLIERS),
    getCountInStore(STORES.INVOICES),
  ]);

  return {
    products,
    customers,
    suppliers,
    invoices,
    total: products + customers + suppliers + invoices,
  };
}

async function getCountInStore(storeName: string): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Restore product from trash by updating local IndexedDB and queuing for Firebase sync
 */
export async function restoreProductFromTrash(
  productId: string,
  userId: string
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORES.PRODUCTS);

  return new Promise((resolve, reject) => {
    const request = store.get(productId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const product = request.result;
      if (!product) {
        reject(new Error('Product not found'));
        return;
      }

      // Update the product to mark as restored (isDeleted=false)
      const updatedProduct = { ...product, isDeleted: false, userId };
      const updateRequest = store.put(updatedProduct);

      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = async () => {
        // Queue the update for Firebase sync
        try {
          await addToSyncQueue(
            'products',
            productId,
            'update',
            updatedProduct,
            userId
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      };
    };
  });
}

/**
 * Permanently delete product by removing from IndexedDB and queuing deletion for Firebase
 */
export async function permanentlyDeleteProduct(
  productId: string,
  userId: string
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([STORES.PRODUCTS, STORES.SYNC_QUEUE], 'readwrite');
  const productsStore = tx.objectStore(STORES.PRODUCTS);
  const syncStore = tx.objectStore(STORES.SYNC_QUEUE);

  return new Promise((resolve, reject) => {
    // Delete from products store
    const deleteRequest = productsStore.delete(productId);

    deleteRequest.onerror = () => reject(deleteRequest.error);
    deleteRequest.onsuccess = () => {
      // Queue the delete for Firebase sync
      const syncItem: SyncMetadata = {
        id: crypto.randomUUID(),
        collectionName: 'products',
        docId: productId,
        action: 'delete',
        data: { id: productId },
        timestamp: Date.now(),
        synced: false,
        attempts: 0,
        userId,
      };

      const syncRequest = syncStore.add(syncItem);

      syncRequest.onerror = () => reject(syncRequest.error);
      syncRequest.onsuccess = () => resolve();
    };
  });
}

/**
 * @deprecated Use hybridDeleteProduct from hybrid-import-v2.ts instead
 * Kept for backward compatibility during migration to Git-like sync
 */
export async function markProductAsDeleted(productId: string, userId: string): Promise<void> {
  console.warn('[IndexedDB] ⚠️ markProductAsDeleted is deprecated, use hybridDeleteProduct from hybrid-import-v2.ts');

  try {
    const { hybridDeleteProduct } = await import('./hybrid-import-v2');
    const user = { uid: userId } as any;
    await hybridDeleteProduct(user, productId);
  } catch (err) {
    console.error('[IndexedDB] Error in deprecated markProductAsDeleted:', err);
    throw err;
  }
}

/**
 * @deprecated Use hybridRestoreProduct from hybrid-import-v2.ts instead
 * Kept for backward compatibility during migration to Git-like sync
 */
export async function restoreProduct(productId: string, userId: string): Promise<void> {
  console.warn('[IndexedDB] ⚠️ restoreProduct is deprecated, use hybridRestoreProduct from hybrid-import-v2.ts');

  try {
    const { hybridRestoreProduct } = await import('./hybrid-import-v2');
    const db = await getDB();
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);

    const product = await new Promise<any>((resolve) => {
      const req = store.get(productId);
      req.onsuccess = () => resolve(req.result);
    });

    if (product) {
      const user = { uid: userId } as any;
      await hybridRestoreProduct(user, productId, product);
    }
  } catch (err) {
    console.error('[IndexedDB] Error in deprecated restoreProduct:', err);
    throw err;
  }
}

/**
 * Get all deleted products for a user
 */
export async function getDeletedProducts(userId: string): Promise<any[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readonly');
  const store = tx.objectStore(STORES.PRODUCTS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const items: any[] = [];
    const request = index.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const product = cursor.value;
        // Only return products marked as deleted
        if (product.userId === userId && product.isDeleted === true) {
          items.push(product);
        }
        cursor.continue();
      } else {
        resolve(items);
      }
    };
  });
}
