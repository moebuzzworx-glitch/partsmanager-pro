/**
 * Low Stock Notification System
 * 
 * Automatically creates notifications when product inventory falls below defined thresholds.
 * Includes duplicate prevention and configurable alert thresholds.
 * 
 * Features:
 * - Detects products below stock threshold
 * - Creates user notifications for low stock items
 * - Prevents duplicate notifications (24-hour cooldown)
 * - Tracks notification creation timestamps
 */

import { collection, query, where, getDocs, Timestamp, addDoc, getDoc, doc, Firestore, updateDoc } from 'firebase/firestore';

// Low stock threshold - products below this quantity trigger alerts
const LOW_STOCK_THRESHOLD = 10;

// Hours to wait before creating another low stock alert for the same product
const NOTIFICATION_COOLDOWN_HOURS = 24;

/**
 * Represents a low stock product
 */
export interface LowStockProduct {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}

/**
 * Detects products with stock levels below the configured threshold for a specific user
 * @param firestore - Firestore database instance
 * @param userId - User ID to check products for
 * @param threshold - Stock level threshold (default: 10)
 * @returns Array of low stock products for that user
 */
export async function detectLowStockProductsForUser(
  firestore: Firestore,
  userId: string,
  threshold: number = LOW_STOCK_THRESHOLD
): Promise<LowStockProduct[]> {
  try {
    const productsRef = collection(firestore, 'products');
    const lowStockQuery = query(
      productsRef,
      where('userId', '==', userId),
      where('stock', '<', threshold)
    );

    const snapshot = await getDocs(lowStockQuery);
    const lowStockProducts: LowStockProduct[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      lowStockProducts.push({
        productId: doc.id,
        productName: data.name || 'Unknown Product',
        currentStock: data.stock || 0,
        threshold: threshold,
      });
    });

    return lowStockProducts;
  } catch (error) {
    console.error('Error detecting low stock products for user:', error);
    throw error;
  }
}

/**
 * Detects products with stock levels below the configured threshold
 * @param firestore - Firestore database instance
 * @param threshold - Stock level threshold (default: 10)
 * @returns Array of low stock products
 */
export async function detectLowStockProducts(
  firestore: Firestore,
  threshold: number = LOW_STOCK_THRESHOLD
): Promise<LowStockProduct[]> {
  try {
    const productsRef = collection(firestore, 'products');
    const lowStockQuery = query(
      productsRef,
      where('stock', '<', threshold)
    );

    const snapshot = await getDocs(lowStockQuery);
    const lowStockProducts: LowStockProduct[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      lowStockProducts.push({
        productId: doc.id,
        productName: data.name || 'Unknown Product',
        currentStock: data.stock || 0,
        threshold: threshold,
      });
    });

    return lowStockProducts;
  } catch (error) {
    console.error('Error detecting low stock products:', error);
    throw error;
  }
}

/**
 * Checks if a low stock notification was recently created for this product
 * to prevent notification spam
 * @param firestore - Firestore database instance
 * @param productId - Product ID to check
 * @returns true if notification exists within cooldown period, false otherwise
 */
async function hasRecentLowStockNotification(
  firestore: Firestore,
  productId: string
): Promise<boolean> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const recentNotificationQuery = query(
      notificationsRef,
      where('productId', '==', productId),
      where('type', '==', 'low-stock'),
      where('createdAt', '>=', new Date(Date.now() - NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000))
    );

    const snapshot = await getDocs(recentNotificationQuery);
    return snapshot.size > 0;
  } catch (error) {
    console.error('Error checking for recent low stock notification:', error);
    return false;
  }
}

/**
 * Creates a low stock alert notification for a specific user
 * @param firestore - Firestore database instance
 * @param userId - User ID to notify
 * @param product - Low stock product details
 * @returns Notification ID if created, null if skipped due to cooldown
 */
export async function createLowStockNotification(
  firestore: Firestore,
  userId: string,
  product: LowStockProduct
): Promise<string | null> {
  try {
    // Check for recent notification to prevent spam
    const hasRecent = await hasRecentLowStockNotification(firestore, product.productId);
    if (hasRecent) {
      console.log(`Skipping notification for product ${product.productId} - recent notification exists`);
      return null;
    }

    const notificationsRef = collection(firestore, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, {
      userId,
      title: 'Low Stock Alert',
      message: `${product.productName} stock is running low (${product.currentStock} units remaining). Current threshold: ${product.threshold} units.`,
      type: 'alert',
      productId: product.productId,
      productName: product.productName,
      currentStock: product.currentStock,
      threshold: product.threshold,
      read: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      actionLink: '/dashboard/products', // Link to products page
      actionLabel: 'View Products',
    });

    console.log(`Created low stock notification for user ${userId}: ${notificationDoc.id}`);
    return notificationDoc.id;
  } catch (error) {
    console.error('Error creating low stock notification:', error);
    throw error;
  }
}

/**
 * Creates or updates a single grouped notification for a user with all their low stock products
 * @param firestore - Firestore database instance
 * @param userId - User ID to notify
 * @param lowStockProducts - Array of low stock products
 * @returns Notification ID if created/updated, null on error
 */
async function createGroupedLowStockNotification(
  firestore: Firestore,
  userId: string,
  lowStockProducts: LowStockProduct[]
): Promise<string | null> {
  try {
    if (lowStockProducts.length === 0) {
      return null;
    }

    const notificationsRef = collection(firestore, 'notifications');

    // Check for existing unread low stock notification for this user
    const existingQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', 'low-stock-alert'),
      where('read', '==', false)
    );

    const existingSnapshot = await getDocs(existingQuery);
    
    const notificationData = {
      userId,
      title: 'Low Stock Alert',
      message: `You have ${lowStockProducts.length} product(s) with low stock levels.`,
      type: 'low-stock-alert',
      products: lowStockProducts.map(p => ({
        productId: p.productId,
        productName: p.productName,
        currentStock: p.currentStock,
        threshold: p.threshold,
      })),
      productCount: lowStockProducts.length,
      read: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      actionLink: '/dashboard/products',
      actionLabel: 'View Products',
    };

    if (existingSnapshot.size > 0) {
      // Update existing notification
      const existingDoc = existingSnapshot.docs[0];
      const docRef = doc(firestore, 'notifications', existingDoc.id);
      await updateDoc(docRef, notificationData);
      
      console.log(`Updated low stock notification for user ${userId}: ${existingDoc.id}`);
      return existingDoc.id;
    } else {
      // Create new notification
      const notificationDoc = await addDoc(notificationsRef, notificationData);
      console.log(`Created grouped low stock notification for user ${userId}: ${notificationDoc.id}`);
      return notificationDoc.id;
    }
  } catch (error) {
    console.error('Error creating grouped low stock notification:', error);
    return null;
  }
}

/**
 * Batch processes low stock products and creates a single grouped notification per user
 * Returns statistics on notifications created/updated
 * @param firestore - Firestore database instance
 * @param threshold - Stock level threshold (default: 10)
 * @returns Statistics object with counts
 */
export async function sendLowStockNotifications(
  firestore: Firestore,
  threshold: number = LOW_STOCK_THRESHOLD
): Promise<{
  lowStockProducts: number;
  notificationsCreated: number;
  usersNotified: number;
  errors: number;
}> {
  try {
    // Get all low stock products
    const lowStockProducts = await detectLowStockProducts(firestore, threshold);
    if (lowStockProducts.length === 0) {
      console.log('No low stock products detected');
      return {
        lowStockProducts: 0,
        notificationsCreated: 0,
        usersNotified: 0,
        errors: 0,
      };
    }

    console.log(`Found ${lowStockProducts.length} products with low stock`);

    // Get all users
    const usersRef = collection(firestore, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const userIds = usersSnapshot.docs.map((doc) => doc.id);

    console.log(`Found ${userIds.length} users to notify`);

    let notificationsCreated = 0;
    let usersNotified = 0;
    let errors = 0;

    // Create grouped notification for each user with all low stock products
    for (const userId of userIds) {
      try {
        const notificationId = await createGroupedLowStockNotification(firestore, userId, lowStockProducts);
        if (notificationId) {
          notificationsCreated++;
          usersNotified++;
        }
      } catch (error) {
        console.error(`Error creating grouped notification for user ${userId}:`, error);
        errors++;
      }
    }

    const stats = {
      lowStockProducts: lowStockProducts.length,
      notificationsCreated,
      usersNotified,
      errors,
    };

    console.log('Low stock notifications sent:', stats);
    return stats;
  } catch (error) {
    console.error('Error in sendLowStockNotifications:', error);
    throw error;
  }
}

/**
 * Gets all low stock alerts that are currently active (unread)
 * @param firestore - Firestore database instance
 * @param userId - User ID to get alerts for
 * @returns Array of unread low stock notifications
 */
export async function getLowStockAlerts(
  firestore: Firestore,
  userId: string
): Promise<any[]> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const alertsQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', 'alert'),
      where('read', '==', false)
    );

    const snapshot = await getDocs(alertsQuery);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      if (!data) return null;
      
      // Ensure products array is always an array if present
      return {
        id: doc.id,
        ...data,
        ...(data.products ? { products: Array.isArray(data.products) ? data.products : [] } : {}),
      };
    }).filter((item): item is any => item !== null);
  } catch (error) {
    console.error('Error getting low stock alerts:', error);
    return [];
  }
}

/**
 * Creates or updates a single grouped low stock notification for the current user
 * Only notifies about the user's own low stock products
 * @param firestore - Firestore database instance
 * @param userId - Current user ID
 * @param threshold - Stock level threshold (default: 10)
 * @returns Statistics object with notification creation details
 */
export async function sendLowStockNotificationForUser(
  firestore: Firestore,
  userId: string,
  threshold: number = LOW_STOCK_THRESHOLD
): Promise<{
  lowStockProducts: number;
  notificationCreated: boolean;
  error: string | null;
}> {
  try {
    // Get only this user's low stock products
    const lowStockProducts = await detectLowStockProductsForUser(firestore, userId, threshold);
    
    if (lowStockProducts.length === 0) {
      console.log(`No low stock products for user ${userId}`);
      return {
        lowStockProducts: 0,
        notificationCreated: false,
        error: null,
      };
    }

    console.log(`Found ${lowStockProducts.length} low stock products for user ${userId}`);

    // Create or update grouped notification for this user
    const notificationId = await createGroupedLowStockNotification(firestore, userId, lowStockProducts);

    return {
      lowStockProducts: lowStockProducts.length,
      notificationCreated: !!notificationId,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error sending low stock notification for user ${userId}:`, error);
    return {
      lowStockProducts: 0,
      notificationCreated: false,
      error: errorMessage,
    };
  }
}
