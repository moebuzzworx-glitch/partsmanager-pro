import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Firestore,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  limit,
  QueryConstraint,
} from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert' | 'low-stock-alert';
  read: boolean;
  createdAt: any;
  action?: {
    label: string;
    href: string;
  };
  resourceId?: string;
  resourceType?: string;
}

/**
 * Fetch unread notifications for a user
 */
export async function fetchUserNotifications(
  firestore: Firestore,
  userId: string,
  includeRead: boolean = false
): Promise<Notification[]> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
    ];

    if (!includeRead) {
      constraints.push(where('read', '==', false));
    }

    // Note: orderBy removed to avoid requiring composite index
    // Sorting will be done in memory instead
    constraints.push(limit(50));

    const q = query(notificationsRef, ...constraints);
    const notificationsSnap = await getDocs(q);

    const notifications: Notification[] = [];
    notificationsSnap.forEach(doc => {
      const data = doc.data();
      if (data) {
        // Ensure products array is always an array if present to avoid iteration errors
        const processedData = {
          ...data,
          ...(data.products ? { products: Array.isArray(data.products) ? data.products : [] } : {}),
        };
        notifications.push({
          id: doc.id,
          ...processedData,
        } as Notification);
      }
    });

    // Sort by createdAt in memory (descending)
    notifications.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Fetch all notifications for a user (including read)
 */
export async function fetchAllUserNotifications(
  firestore: Firestore,
  userId: string,
  limitCount: number = 100
): Promise<Notification[]> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const notificationsSnap = await getDocs(q);

    const notifications: Notification[] = [];
    notificationsSnap.forEach(doc => {
      const data = doc.data();
      if (data) {
        // Ensure products array is always an array if present to avoid iteration errors
        const processedData = {
          ...data,
          ...(data.products ? { products: Array.isArray(data.products) ? data.products : [] } : {}),
        };
        notifications.push({
          id: doc.id,
          ...processedData,
        } as Notification);
      }
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  firestore: Firestore,
  notificationId: string
): Promise<boolean> {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(
  firestore: Firestore,
  userId: string
): Promise<boolean> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const notificationsSnap = await getDocs(q);

    const promises = notificationsSnap.docs.map(doc =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  firestore: Firestore,
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' | 'alert',
  options?: {
    action?: { label: string; href: string };
    resourceId?: string;
    resourceType?: string;
  }
): Promise<string | null> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: Timestamp.now(),
      action: options?.action,
      resourceId: options?.resourceId,
      resourceType: options?.resourceType,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Create notifications for admins about system events
 */
export async function createAdminNotification(
  firestore: Firestore,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' | 'alert',
  options?: {
    action?: { label: string; href: string };
    resourceId?: string;
    resourceType?: string;
  }
): Promise<string[]> {
  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('role', '==', 'admin'));
    const adminsSnap = await getDocs(q);

    const notificationIds: string[] = [];
    const notificationsRef = collection(firestore, 'notifications');

    for (const adminDoc of adminsSnap.docs) {
      const docRef = await addDoc(notificationsRef, {
        userId: adminDoc.id,
        title,
        message,
        type,
        read: false,
        createdAt: Timestamp.now(),
        action: options?.action,
        resourceId: options?.resourceId,
        resourceType: options?.resourceType,
      });
      notificationIds.push(docRef.id);
    }

    return notificationIds;
  } catch (error) {
    console.error('Error creating admin notification:', error);
    return [];
  }
}

/**
 * Get unread count for user
 */
export async function getUnreadCount(
  firestore: Firestore,
  userId: string
): Promise<number> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const notificationsSnap = await getDocs(q);
    return notificationsSnap.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}
