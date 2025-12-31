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
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
        if (product.userId === userId && product.deleted !== true) {
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
export async function addToSyncQueue(
  collectionName: string,
  docId: string,
  action: 'create' | 'update' | 'delete',
  data: any,
  userId: string
): Promise<number> {
  console.log('[IndexedDB] addToSyncQueue called:', collectionName, '/', docId, 'action:', action);
  const db = await getDB();
  console.log('[IndexedDB] Got database for addToSyncQueue');
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
  const store = tx.objectStore(STORES.SYNC_QUEUE);

  const queueItem: SyncMetadata = {
    id: `${collectionName}-${docId}-${Date.now()}`,
    collectionName,
    docId,
    action,
    data,
    timestamp: Date.now(),
    synced: false,
    attempts: 0,
    userId,
  };

  return new Promise((resolve, reject) => {
    const request = store.add(queueItem);
    request.onerror = () => {
      console.error('[IndexedDB] Error adding to queue:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      console.log('[IndexedDB] Item added to queue:', queueItem.id);
      
      // Wait for transaction
      tx.oncomplete = () => {
        console.log('[IndexedDB] addToSyncQueue transaction complete');
        resolve(request.result as number);
      };
      
      tx.onerror = () => {
        console.error('[IndexedDB] addToSyncQueue transaction error:', tx.error);
        reject(tx.error);
      };
    };
  });
}

/**
 * Get unsync'd items from queue - SIMPLIFIED VERSION
 */
export async function getUnsyncedItems(userId: string): Promise<SyncMetadata[]> {
  console.log('[IndexedDB] getUnsyncedItems called for user:', userId);
  
  try {
    const db = await getDB();
    console.log('[IndexedDB] Got database for getUnsyncedItems');

    return new Promise((resolve, reject) => {
      let completed = false;
      
      // Hard timeout after 3 seconds
      const timeoutId = setTimeout(() => {
        if (!completed) {
          console.warn('[IndexedDB] getUnsyncedItems timeout - returning empty array');
          completed = true;
          resolve([]); // Return empty instead of hanging
        }
      }, 3000);

      try {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
        const store = tx.objectStore(STORES.SYNC_QUEUE);

        // Simple getAll request
        const getAllRequest = store.getAll();

        getAllRequest.onerror = () => {
          if (!completed) {
            console.error('[IndexedDB] getAll error:', getAllRequest.error);
            completed = true;
            clearTimeout(timeoutId);
            resolve([]); // Return empty on error instead of rejecting
          }
        };

        getAllRequest.onsuccess = () => {
          if (completed) return;

          try {
            const allItems = getAllRequest.result as SyncMetadata[];
            console.log('[IndexedDB] getAll returned', allItems.length, 'items');

            // Filter for unsynced items
            const unsyncedItems = allItems.filter(
              (item) => item.synced === false && item.userId === userId
            );

            console.log('[IndexedDB] Filtered to', unsyncedItems.length, 'unsynced items');

            completed = true;
            clearTimeout(timeoutId);
            resolve(unsyncedItems);
          } catch (err) {
            console.error('[IndexedDB] Error processing results:', err);
            completed = true;
            clearTimeout(timeoutId);
            resolve([]); // Return empty on error
          }
        };

        // Transaction complete/error handlers
        tx.oncomplete = () => {
          if (!completed) {
            console.log('[IndexedDB] Transaction completed');
          }
        };

        tx.onerror = () => {
          if (!completed) {
            console.error('[IndexedDB] Transaction error:', tx.error);
            completed = true;
            clearTimeout(timeoutId);
            resolve([]); // Return empty on transaction error
          }
        };
      } catch (err) {
        console.error('[IndexedDB] Exception in getUnsyncedItems:', err);
        completed = true;
        clearTimeout(timeoutId);
        resolve([]); // Return empty on exception
      }
    });
  } catch (err) {
    console.error('[IndexedDB] Error getting database:', err);
    return []; // Return empty if can't even get database
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

      // Update the product to mark as restored (deleted=false)
      const updatedProduct = { ...product, deleted: false, userId };
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
 * Mark product as deleted (move to trash) - stores deletion flag locally and queues to sync
 */
export async function markProductAsDeleted(productId: string, userId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([STORES.PRODUCTS, STORES.SYNC_QUEUE], 'readwrite');
  const productStore = tx.objectStore(STORES.PRODUCTS);
  const syncStore = tx.objectStore(STORES.SYNC_QUEUE);

  return new Promise((resolve, reject) => {
    // First, get the product
    const getRequest = productStore.get(productId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const product = getRequest.result;
      if (!product) {
        reject(new Error('Product not found'));
        return;
      }

      // Mark as deleted locally
      product.deleted = true;
      product.deletedAt = new Date().toISOString();
      
      const updateRequest = productStore.put(product);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => {
        // Queue the deletion for sync
        const syncItem: SyncMetadata = {
          id: `${productId}-delete-${Date.now()}`,
          collectionName: STORES.PRODUCTS,
          docId: productId,
          action: 'delete',
          data: { deleted: true, deletedAt: product.deletedAt },
          timestamp: Date.now(),
          synced: false,
          attempts: 0,
          userId,
        };

        const syncRequest = syncStore.add(syncItem);
        syncRequest.onerror = () => reject(syncRequest.error);
        syncRequest.onsuccess = () => resolve();
      };
    };
  });
}

/**
 * Restore product from trash - clears deletion flag locally and queues update to sync
 */
export async function restoreProduct(productId: string, userId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([STORES.PRODUCTS, STORES.SYNC_QUEUE], 'readwrite');
  const productStore = tx.objectStore(STORES.PRODUCTS);
  const syncStore = tx.objectStore(STORES.SYNC_QUEUE);

  return new Promise((resolve, reject) => {
    // First, get the product
    const getRequest = productStore.get(productId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const product = getRequest.result;
      if (!product) {
        reject(new Error('Product not found'));
        return;
      }

      // Remove deletion flag
      product.deleted = false;
      delete product.deletedAt;
      
      const updateRequest = productStore.put(product);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => {
        // Queue the restoration update for sync
        const syncItem: SyncMetadata = {
          id: `${productId}-restore-${Date.now()}`,
          collectionName: STORES.PRODUCTS,
          docId: productId,
          action: 'update',
          data: { deleted: false },
          timestamp: Date.now(),
          synced: false,
          attempts: 0,
          userId,
        };

        const syncRequest = syncStore.add(syncItem);
        syncRequest.onerror = () => reject(syncRequest.error);
        syncRequest.onsuccess = () => resolve();
      };
    };
  });
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
        if (product.userId === userId && product.deleted === true) {
          items.push(product);
        }
        cursor.continue();
      } else {
        resolve(items);
      }
    };
  });
}
