import {
  collection,
  query,
  where,
  getDocs,
  Firestore,
  Timestamp,
  addDoc,
} from 'firebase/firestore';

/**
 * Subscription renewal notification messages and pricing
 */
const SUBSCRIPTION_CONFIG = {
  trial: {
    durationDays: 5,
    price: 0,
    currency: 'DA',
    renewalTitle: 'Trial Period Expiring Soon',
    renewalMessage: (daysLeft: number) => {
      if (daysLeft > 0) {
        return `Your trial access expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Upgrade to Premium to continue using all features.`;
      }
      return 'Your trial access has expired. Upgrade to Premium to regain access.';
    },
    actionLabel: 'Upgrade to Premium',
    actionHref: '/en/settings#upgrade',
  },
  premium: {
    durationDays: 365,
    price: 5000,
    currency: 'DA',
    renewalTitle: 'Premium Subscription Renewal',
    renewalMessage: (daysLeft: number) => {
      if (daysLeft > 0) {
        return `Your Premium subscription expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew now to maintain continuous access. Renewal cost: 5,000 DA.`;
      }
      return 'Your Premium subscription has expired. Renew now to regain full access. Renewal cost: 5,000 DA.';
    },
    actionLabel: 'Renew Subscription',
    actionHref: '/en/settings#renew',
  },
};

export interface SubscriptionUser {
  uid: string;
  email: string;
  subscription: 'trial' | 'premium';
  trialStartDate?: any;
  premiumExpiryDate?: any;
  daysUntilExpiry: number;
  shouldNotify: boolean;
}

/**
 * Calculate days remaining in subscription
 */
function calculateDaysUntilExpiry(expiryTimestamp: any): number {
  if (!expiryTimestamp) return -1;

  const expiryDate = expiryTimestamp.toDate ? expiryTimestamp.toDate() : new Date(expiryTimestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Determine if user should receive a notification
 * - 5 days before expiry
 * - On expiry date (0 days left)
 * - After expiry (-1 to -30 days)
 */
function shouldNotifyUser(daysUntilExpiry: number): boolean {
  // Notify 5 days before, on expiry day, and for 30 days after
  return daysUntilExpiry <= 5 && daysUntilExpiry >= -30;
}

/**
 * Get all users with expiring subscriptions
 */
export async function getExpiringSubscriptionUsers(
  firestore: Firestore
): Promise<SubscriptionUser[]> {
  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('emailVerified', '==', true));
    const usersSnap = await getDocs(q);

    const expiringUsers: SubscriptionUser[] = [];

    usersSnap.forEach(doc => {
      const userData = doc.data();
      const subscription = userData.subscription || 'trial';
      let daysUntilExpiry = -1;

      if (subscription === 'trial') {
        daysUntilExpiry = calculateDaysUntilExpiry(userData.trialStartDate);
        if (userData.trialStartDate) {
          const startDate = userData.trialStartDate.toDate();
          const trialEndDate = new Date(startDate);
          trialEndDate.setDate(trialEndDate.getDate() + 5);
          daysUntilExpiry = calculateDaysUntilExpiry(trialEndDate);
        }
      } else if (subscription === 'premium') {
        daysUntilExpiry = calculateDaysUntilExpiry(userData.premiumExpiryDate);
      }

      if (shouldNotifyUser(daysUntilExpiry)) {
        expiringUsers.push({
          uid: doc.id,
          email: userData.email,
          subscription: subscription as 'trial' | 'premium',
          trialStartDate: userData.trialStartDate,
          premiumExpiryDate: userData.premiumExpiryDate,
          daysUntilExpiry,
          shouldNotify: true,
        });
      }
    });

    return expiringUsers;
  } catch (error) {
    console.error('Error fetching expiring subscription users:', error);
    return [];
  }
}

/**
 * Create subscription renewal notification for a user
 */
export async function createSubscriptionRenewalNotification(
  firestore: Firestore,
  userId: string,
  subscription: 'trial' | 'premium',
  daysUntilExpiry: number
): Promise<string | null> {
  try {
    const config = SUBSCRIPTION_CONFIG[subscription];
    const notificationsRef = collection(firestore, 'notifications');

    const docRef = await addDoc(notificationsRef, {
      userId,
      title: config.renewalTitle,
      message: config.renewalMessage(daysUntilExpiry),
      type: daysUntilExpiry > 0 ? 'warning' : 'alert',
      read: false,
      createdAt: Timestamp.now(),
      action: {
        label: config.actionLabel,
        href: config.actionHref,
      },
      resourceType: 'subscription',
      resourceId: subscription,
      subscription,
      daysUntilExpiry,
    });

    console.log(`✅ Created ${subscription} renewal notification for user ${userId}`);
    return docRef.id;
  } catch (error) {
    console.error(`Error creating notification for ${userId}:`, error);
    return null;
  }
}

/**
 * Check for duplicate notifications (don't spam same user)
 */
export async function hasRecentNotification(
  firestore: Firestore,
  userId: string,
  subscription: 'trial' | 'premium',
  hoursBack: number = 24
): Promise<boolean> {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('resourceId', '==', subscription)
    );

    const notificationsSnap = await getDocs(q);
    let hasRecent = false;

    notificationsSnap.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
      if (createdAt > cutoffTime) {
        hasRecent = true;
      }
    });

    return hasRecent;
  } catch (error) {
    console.error('Error checking for recent notifications:', error);
    return false;
  }
}

/**
 * Send notifications to all users with expiring subscriptions
 * This should be called by a Cloud Function on a schedule (daily recommended)
 */
export async function sendSubscriptionRenewalNotifications(
  firestore: Firestore
): Promise<{ sent: number; skipped: number; errors: number }> {
  try {
    console.log('🔔 Starting subscription renewal notifications...');

    const expiringUsers = await getExpiringSubscriptionUsers(firestore);
    console.log(`Found ${expiringUsers.length} users with expiring subscriptions`);

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of expiringUsers) {
      try {
        // Check if we already sent a notification in the last 24 hours
        const hasRecent = await hasRecentNotification(firestore, user.uid, user.subscription, 24);

        if (hasRecent) {
          console.log(`⏭️  Skipping ${user.email} - already notified in last 24 hours`);
          skipped++;
          continue;
        }

        // Create notification
        const notificationId = await createSubscriptionRenewalNotification(
          firestore,
          user.uid,
          user.subscription,
          user.daysUntilExpiry
        );

        if (notificationId) {
          sent++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errors++;
      }
    }

    console.log(
      `✅ Notification cycle complete: Sent=${sent}, Skipped=${skipped}, Errors=${errors}`
    );
    return { sent, skipped, errors };
  } catch (error) {
    console.error('Fatal error in sendSubscriptionRenewalNotifications:', error);
    return { sent: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Get subscription config for display purposes
 */
export function getSubscriptionConfig(subscription: 'trial' | 'premium') {
  return SUBSCRIPTION_CONFIG[subscription];
}

/**
 * Get all subscription info
 */
export function getAllSubscriptionConfigs() {
  return SUBSCRIPTION_CONFIG;
}
