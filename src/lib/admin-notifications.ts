/**
 * Admin (App Manager) System Notifications
 * 
 * Manages system-level notifications for app administrators/managers.
 * Handles business events like new user signups, system alerts, and user management actions.
 * 
 * Features:
 * - New user signup notifications
 * - System health and alert notifications
 * - User management event notifications (plan changes, suspensions, etc.)
 * - Customizable message templates
 * - Admin-only broadcast capability
 */

import { collection, query, where, getDocs, Timestamp, addDoc, Firestore } from 'firebase/firestore';

/**
 * Notification event types for admin notifications
 */
export enum AdminNotificationEventType {
  NewUserSignup = 'new-user-signup',
  SubscriptionUpgraded = 'subscription-upgraded',
  SubscriptionDowngraded = 'subscription-downgraded',
  SubscriptionExpired = 'subscription-expired',
  UserSuspended = 'user-suspended',
  UserReactivated = 'user-reactivated',
  SystemAlert = 'system-alert',
  HighActivityAlert = 'high-activity-alert',
  LowRevenueAlert = 'low-revenue-alert',
}

/**
 * Represents an admin notification event
 */
export interface AdminNotificationEvent {
  eventType: AdminNotificationEventType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  relatedUserId?: string;
  relatedResourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for admin notification templates
 */
const ADMIN_NOTIFICATION_TEMPLATES: Record<AdminNotificationEventType, {
  title: string;
  messageTemplate: (data: any) => string;
  severity: 'info' | 'warning' | 'error' | 'success';
  actionLink?: (data: any) => string;
}> = {
  [AdminNotificationEventType.NewUserSignup]: {
    title: '👤 New User Signup',
    messageTemplate: (data) => `New user registered: ${data.userEmail || 'Unknown'} (${data.subscription || 'trial'})`,
    severity: 'info',
    actionLink: (data) => `/admin/users?userId=${data.userId}`,
  },
  [AdminNotificationEventType.SubscriptionUpgraded]: {
    title: '⬆️ Subscription Upgraded',
    messageTemplate: (data) => `User ${data.userEmail} upgraded from ${data.fromSubscription} to ${data.toSubscription}`,
    severity: 'success',
    actionLink: (data) => `/admin/users?userId=${data.userId}`,
  },
  [AdminNotificationEventType.SubscriptionDowngraded]: {
    title: '⬇️ Subscription Downgraded',
    messageTemplate: (data) => `User ${data.userEmail} downgraded from ${data.fromSubscription} to ${data.toSubscription}`,
    severity: 'warning',
    actionLink: (data) => `/admin/users?userId=${data.userId}`,
  },
  [AdminNotificationEventType.SubscriptionExpired]: {
    title: '⏰ Subscription Expired',
    messageTemplate: (data) => `Subscription expired for user ${data.userEmail}. Action may be required.`,
    severity: 'warning',
    actionLink: (data) => `/admin/users?userId=${data.userId}`,
  },
  [AdminNotificationEventType.UserSuspended]: {
    title: '🚫 User Suspended',
    messageTemplate: (data) => `User ${data.userEmail} has been suspended. Reason: ${data.reason || 'Not specified'}`,
    severity: 'error',
    actionLink: (data) => `/admin/users?userId=${data.userId}`,
  },
  [AdminNotificationEventType.UserReactivated]: {
    title: '✅ User Reactivated',
    messageTemplate: (data) => `User ${data.userEmail} has been reactivated and can access the system again.`,
    severity: 'success',
    actionLink: (data) => `/admin/users?userId=${data.userId}`,
  },
  [AdminNotificationEventType.SystemAlert]: {
    title: '⚠️ System Alert',
    messageTemplate: (data) => data.message || 'A system alert requires your attention',
    severity: 'warning',
  },
  [AdminNotificationEventType.HighActivityAlert]: {
    title: '📊 High Activity Detected',
    messageTemplate: (data) => `Unusual activity detected: ${data.activityType || 'Multiple transactions'} in the last hour`,
    severity: 'info',
  },
  [AdminNotificationEventType.LowRevenueAlert]: {
    title: '💰 Low Revenue Alert',
    messageTemplate: (data) => `Revenue is lower than expected this period. Current: ${data.currentRevenue || 'N/A'}`,
    severity: 'warning',
    actionLink: (data) => `/admin/analytics`,
  },
};

/**
 * Gets all admin users from the system
 * @param firestore - Firestore database instance
 * @returns Array of admin user IDs
 */
export async function getAdminUsers(firestore: Firestore): Promise<string[]> {
  try {
    const usersRef = collection(firestore, 'users');
    const adminsQuery = query(usersRef, where('role', '==', 'admin'));

    const snapshot = await getDocs(adminsQuery);
    return snapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}

/**
 * Notifies all admins about a new user signup
 * @param firestore - Firestore database instance
 * @param newUserData - Data about the newly signed up user
 * @returns Statistics object
 */
export async function notifyNewUserSignup(
  firestore: Firestore,
  newUserData: {
    userId: string;
    userEmail: string;
    subscription: 'trial' | 'premium';
  }
): Promise<{ notificationsCreated: number; errors: number }> {
  return createAdminNotificationBatch(firestore, {
    eventType: AdminNotificationEventType.NewUserSignup,
    title: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.NewUserSignup].title,
    message: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.NewUserSignup].messageTemplate(newUserData),
    severity: 'info',
    relatedUserId: newUserData.userId,
    metadata: newUserData,
  });
}

/**
 * Notifies all admins about a subscription change
 * @param firestore - Firestore database instance
 * @param subscriptionChangeData - Subscription change details
 * @returns Statistics object
 */
export async function notifySubscriptionChange(
  firestore: Firestore,
  subscriptionChangeData: {
    userId: string;
    userEmail: string;
    fromSubscription: string;
    toSubscription: string;
  }
): Promise<{ notificationsCreated: number; errors: number }> {
  const isUpgrade = subscriptionChangeData.toSubscription === 'premium' && subscriptionChangeData.fromSubscription === 'trial';
  const eventType = isUpgrade
    ? AdminNotificationEventType.SubscriptionUpgraded
    : AdminNotificationEventType.SubscriptionDowngraded;

  return createAdminNotificationBatch(firestore, {
    eventType,
    title: ADMIN_NOTIFICATION_TEMPLATES[eventType].title,
    message: ADMIN_NOTIFICATION_TEMPLATES[eventType].messageTemplate(subscriptionChangeData),
    severity: ADMIN_NOTIFICATION_TEMPLATES[eventType].severity,
    relatedUserId: subscriptionChangeData.userId,
    metadata: subscriptionChangeData,
  });
}

/**
 * Notifies all admins about a subscription expiration
 * @param firestore - Firestore database instance
 * @param expirationData - Expiration details
 * @returns Statistics object
 */
export async function notifySubscriptionExpired(
  firestore: Firestore,
  expirationData: {
    userId: string;
    userEmail: string;
    expiryDate: Date;
  }
): Promise<{ notificationsCreated: number; errors: number }> {
  return createAdminNotificationBatch(firestore, {
    eventType: AdminNotificationEventType.SubscriptionExpired,
    title: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.SubscriptionExpired].title,
    message: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.SubscriptionExpired].messageTemplate(expirationData),
    severity: 'warning',
    relatedUserId: expirationData.userId,
    metadata: expirationData,
  });
}

/**
 * Notifies all admins about a user suspension
 * @param firestore - Firestore database instance
 * @param suspensionData - Suspension details
 * @returns Statistics object
 */
export async function notifyUserSuspended(
  firestore: Firestore,
  suspensionData: {
    userId: string;
    userEmail: string;
    reason?: string;
    suspendedAt: Date;
  }
): Promise<{ notificationsCreated: number; errors: number }> {
  return createAdminNotificationBatch(firestore, {
    eventType: AdminNotificationEventType.UserSuspended,
    title: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.UserSuspended].title,
    message: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.UserSuspended].messageTemplate(suspensionData),
    severity: 'error',
    relatedUserId: suspensionData.userId,
    metadata: suspensionData,
  });
}

/**
 * Notifies all admins about a user reactivation
 * @param firestore - Firestore database instance
 * @param reactivationData - Reactivation details
 * @returns Statistics object
 */
export async function notifyUserReactivated(
  firestore: Firestore,
  reactivationData: {
    userId: string;
    userEmail: string;
    reactivatedAt: Date;
  }
): Promise<{ notificationsCreated: number; errors: number }> {
  return createAdminNotificationBatch(firestore, {
    eventType: AdminNotificationEventType.UserReactivated,
    title: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.UserReactivated].title,
    message: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.UserReactivated].messageTemplate(reactivationData),
    severity: 'success',
    relatedUserId: reactivationData.userId,
    metadata: reactivationData,
  });
}

/**
 * Sends a general system alert to all admins
 * @param firestore - Firestore database instance
 * @param alertData - Alert details
 * @returns Statistics object
 */
export async function sendSystemAlert(
  firestore: Firestore,
  alertData: {
    message: string;
    severity?: 'info' | 'warning' | 'error';
  }
): Promise<{ notificationsCreated: number; errors: number }> {
  return createAdminNotificationBatch(firestore, {
    eventType: AdminNotificationEventType.SystemAlert,
    title: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.SystemAlert].title,
    message: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.SystemAlert].messageTemplate(alertData),
    severity: alertData.severity || 'warning',
    metadata: alertData,
  });
}

/**
 * Sends a high activity alert to all admins
 * @param firestore - Firestore database instance
 * @param activityData - Activity details
 * @returns Statistics object
 */
export async function sendHighActivityAlert(
  firestore: Firestore,
  activityData: {
    activityType: string;
    count?: number;
    timeframe?: string;
  }
): Promise<{ notificationsCreated: number; errors: number }> {
  return createAdminNotificationBatch(firestore, {
    eventType: AdminNotificationEventType.HighActivityAlert,
    title: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.HighActivityAlert].title,
    message: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.HighActivityAlert].messageTemplate(activityData),
    severity: 'info',
    metadata: activityData,
  });
}

/**
 * Sends a low revenue alert to all admins
 * @param firestore - Firestore database instance
 * @param revenueData - Revenue details
 * @returns Statistics object
 */
export async function sendLowRevenueAlert(
  firestore: Firestore,
  revenueData: {
    currentRevenue: number;
    expectedRevenue: number;
    period: string;
  }
): Promise<{ notificationsCreated: number; errors: number }> {
  return createAdminNotificationBatch(firestore, {
    eventType: AdminNotificationEventType.LowRevenueAlert,
    title: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.LowRevenueAlert].title,
    message: ADMIN_NOTIFICATION_TEMPLATES[AdminNotificationEventType.LowRevenueAlert].messageTemplate(revenueData),
    severity: 'warning',
    metadata: revenueData,
  });
}

/**
 * Core function to create and broadcast admin notification to all admins
 * @param firestore - Firestore database instance
 * @param event - Admin notification event
 * @returns Statistics object
 */
async function createAdminNotificationBatch(
  firestore: Firestore,
  event: AdminNotificationEvent
): Promise<{ notificationsCreated: number; errors: number }> {
  try {
    // Get all admin users
    const adminIds = await getAdminUsers(firestore);
    if (adminIds.length === 0) {
      console.warn('No admin users found to notify');
      return { notificationsCreated: 0, errors: 0 };
    }

    console.log(`Sending admin notification to ${adminIds.length} admins:`, event.title);

    let notificationsCreated = 0;
    let errors = 0;

    // Create notification for each admin
    const notificationsRef = collection(firestore, 'notifications');
    for (const adminId of adminIds) {
      try {
        const template = ADMIN_NOTIFICATION_TEMPLATES[event.eventType];
        const actionLink = template.actionLink ? template.actionLink(event.metadata || {}) : undefined;

        const notificationData: any = {
          userId: adminId,
          title: event.title,
          message: event.message,
          type: 'admin-system', // Special type for admin notifications
          eventType: event.eventType,
          severity: event.severity,
          read: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        if (event.relatedUserId) {
          notificationData.relatedUserId = event.relatedUserId;
        }

        if (event.relatedResourceId) {
          notificationData.relatedResourceId = event.relatedResourceId;
        }

        if (event.metadata) {
          notificationData.metadata = event.metadata;
        }

        if (actionLink) {
          notificationData.actionLink = actionLink;
          notificationData.actionLabel = 'View Details';
        }

        await addDoc(notificationsRef, notificationData);
        notificationsCreated++;
      } catch (error) {
        console.error(`Error creating notification for admin ${adminId}:`, error);
        errors++;
      }
    }

    const stats = { notificationsCreated, errors };
    console.log('Admin notifications sent:', stats);
    return stats;
  } catch (error) {
    console.error('Error in createAdminNotificationBatch:', error);
    throw error;
  }
}

/**
 * Gets all unread admin system notifications for an admin user
 * @param firestore - Firestore database instance
 * @param adminId - Admin user ID
 * @returns Array of unread admin notifications
 */
export async function getAdminSystemNotifications(
  firestore: Firestore,
  adminId: string
): Promise<any[]> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const adminNotificationsQuery = query(
      notificationsRef,
      where('userId', '==', adminId),
      where('type', '==', 'admin-system'),
      where('read', '==', false)
    );

    const snapshot = await getDocs(adminNotificationsQuery);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      if (!data) return null;
      
      return {
        id: doc.id,
        ...data,
      };
    }).filter((item): item is any => item !== null);
  } catch (error) {
    console.error('Error getting admin system notifications:', error);
    return [];
  }
}
