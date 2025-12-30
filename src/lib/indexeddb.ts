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
const DB_VERSION = 1;

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
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Products store
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productStore.createIndex('userId', 'userId', { unique: false });
        productStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Customers store
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        customerStore.createIndex('userId', 'userId', { unique: false });
        customerStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Suppliers store
      if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
        const supplierStore = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' });
        supplierStore.createIndex('userId', 'userId', { unique: false });
      }

      // Invoices store
      if (!db.objectStoreNames.contains(STORES.INVOICES)) {
        const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: 'id' });
        invoiceStore.createIndex('userId', 'userId', { unique: false });
        invoiceStore.createIndex('invoiceDate', 'invoiceDate', { unique: false });
      }

      // Sync queue (for offline changes)
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('userId', 'userId', { unique: false });
        syncStore.createIndex('synced', 'synced', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Metadata store (last sync times, etc)
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get database instance
 */
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Save a single product to IndexedDB
 */
export async function saveProduct(product: any, userId: string): Promise<void> {
  const db = await getDB();
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
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Save multiple products in batch (for imports)
 */
export async function saveProductsBatch(products: any[], userId: string): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
  const store = tx.objectStore(STORES.PRODUCTS);

  let saved = 0;

  return new Promise((resolve, reject) => {
    products.forEach((product) => {
      const productWithMeta = {
        ...product,
        userId,
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(productWithMeta);
      request.onsuccess = () => {
        saved++;
      };
      request.onerror = () => {
        console.error('Error saving product:', request.error);
      };
    });

    tx.oncomplete = () => resolve(saved);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all products for a user
 */
export async function getProductsByUser(userId: string): Promise<any[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.PRODUCTS, 'readonly');
  const store = tx.objectStore(STORES.PRODUCTS);
  const index = store.index('userId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(userId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
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
  const db = await getDB();
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
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as number);
  });
}

/**
 * Get unsync'd items from queue
 */
export async function getUnsyncedItems(userId: string): Promise<SyncMetadata[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
  const store = tx.objectStore(STORES.SYNC_QUEUE);
  const index = store.index('synced');

  return new Promise((resolve, reject) => {
    // Iterate through ALL items in the synced index
    // Then filter in JavaScript for synced === false and matching userId
    const request = index.openCursor();
    const items: SyncMetadata[] = [];
    
    request.onerror = () => reject(request.error);
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const item = cursor.value;
        // Filter: synced must be false AND userId must match
        if (item.synced === false && item.userId === userId) {
          items.push(item);
        }
        cursor.continue();
      } else {
        // Done iterating through all items
        resolve(items);
      }
    };
  });
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
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
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
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
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
