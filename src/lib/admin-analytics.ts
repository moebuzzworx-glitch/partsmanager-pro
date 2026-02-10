import {
  collection,
  query,
  where,
  getDocs,
  Firestore,
  CollectionReference,
  getDocs as getDocsImport
} from 'firebase/firestore';

export interface AnalyticsData {
  activeUsers: number;
  systemStatus: 'healthy' | 'warning' | 'error';
}

export interface UserGrowthMetric {
  date: string; // YYYY-MM
  count: number; // New users that month
  total: number; // Cumulative total
}

/**
 * Fetch comprehensive analytics data for admin dashboard
 */
export async function fetchAnalyticsData(firestore: Firestore): Promise<AnalyticsData> {
  try {
    // Fetch all users
    const usersRef = collection(firestore, 'users');
    const usersSnap = await getDocs(usersRef);
    const activeUsers = usersSnap.size;

    // Simulate system check (in real app, check API health)
    let systemStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    // Example logic: if users > 1000 without upgrading, maybe warning? 
    // For now, keep it simple.

    return {
      activeUsers,
      systemStatus,
    };
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return {
      activeUsers: 0,
      systemStatus: 'error',
    };
  }
}

/**
 * Fetch user growth metrics for chart data
 */
export async function fetchUserGrowthMetrics(firestore: Firestore): Promise<UserGrowthMetric[]> {
  try {
    const usersRef = collection(firestore, 'users');
    const usersSnap = await getDocs(usersRef);

    const monthlyGrowth: { [key: string]: number } = {};

    usersSnap.forEach(doc => {
      const data = doc.data();
      // Ensure we have a valid date
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      const monthKey = createdAt.toISOString().slice(0, 7); // YYYY-MM

      monthlyGrowth[monthKey] = (monthlyGrowth[monthKey] || 0) + 1;
    });

    // Convert to sorted array
    const sortedMonths = Object.keys(monthlyGrowth).sort();

    let cumulative = 0;
    const metrics: UserGrowthMetric[] = sortedMonths.map(month => {
      const count = monthlyGrowth[month];
      cumulative += count;
      return {
        date: month,
        count,
        total: cumulative
      };
    });

    return metrics;

  } catch (error) {
    console.error('Error fetching user growth metrics:', error);
    return [];
  }
}

// Deprecated functions removed for clarity or can be kept if needed for other parts, 
// but user requested cleaning up business logic from Admin.
// Removing fetchSalesMetrics, fetchInventoryMetrics, fetchUserMetrics (redundant)
// Keeping core utility like logging.


export interface SubscriptionStats {
  trial: number;
  premium: number;
  expired: number;
  paymentDistribution: {
    epay: number;
    cash: number;
  };
}

export interface ActivityByHour {
  hour: number;
  count: number;
}

/**
 * Fetch subscription distribution
 */
export async function fetchSubscriptionStats(firestore: Firestore): Promise<SubscriptionStats> {
  try {
    const usersRef = collection(firestore, 'users');
    const usersSnap = await getDocs(usersRef);

    // Initialize stats with explicit typing
    const stats: SubscriptionStats = {
      trial: 0,
      premium: 0,
      expired: 0,
      paymentDistribution: {
        epay: 0,
        cash: 0
      }
    };

    usersSnap.forEach(doc => {
      const data = doc.data();
      const rawStatus = data.subscription || 'trial';
      // Ensure status is valid
      const status: keyof Omit<SubscriptionStats, 'paymentDistribution'> =
        (rawStatus === 'premium' || rawStatus === 'expired') ? rawStatus : 'trial';

      stats[status]++;

      if (status === 'premium') {
        // Logic: If chargily/paymentMethod exists -> epay. Else -> cash (manual)
        const isEpay = data.paymentMethod === 'chargily' ||
          data.subscriptionSource === 'chargily' ||
          !!data.chargilyCustomerId ||
          data.lastPaymentMethod === 'epay';

        if (isEpay) {
          stats.paymentDistribution.epay++;
        } else {
          stats.paymentDistribution.cash++;
        }
      }
    });

    return stats;
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return {
      trial: 0,
      premium: 0,
      expired: 0,
      paymentDistribution: { epay: 0, cash: 0 }
    };
  }
}

/**
 * Fetch system activity by hour (based on User creation and Sales timestamps)
 * to allow Admins to see "Peak Load" times.
 */
export async function fetchActivityByHour(firestore: Firestore): Promise<ActivityByHour[]> {
  try {
    const hours = new Array(24).fill(0);

    // 1. Count User Registrations by hour
    const usersRef = collection(firestore, 'users');
    const usersSnap = await getDocs(usersRef);

    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.createdAt?.toDate) {
        const hour = data.createdAt.toDate().getHours();
        hours[hour]++;
      }
    });

    // 2. Count Sales by hour (if accessible) to better represent "Load"
    // This gives a truer picture of when the system is actually being USED vs just signups
    try {
      const salesRef = collection(firestore, 'sales');
      // Limit to recent sales if possible, but for now just fetching all for distribution pattern
      const salesSnap = await getDocs(salesRef);
      salesSnap.forEach(doc => {
        const data = doc.data();
        if (data.date?.toDate) {
          const hour = data.date.toDate().getHours();
          hours[hour]++;
        } else if (data.saleDate?.toDate) {
          const hour = data.saleDate.toDate().getHours();
          hours[hour]++;
        }
      });
    } catch (e) {
      // Ignore sales fetch error if permissions deny, just show user activity
      console.warn('Could not fetch sales for activity metric', e);
    }

    return hours.map((count, hour) => ({ hour, count }));
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  firestore: Firestore,
  action: string,
  userId: string,
  details: string,
  resource: string = ''
) {
  try {
    const auditRef = collection(firestore, 'audit_logs');
    const docRef = await (auditRef as any).add({
      action,
      userId,
      details,
      resource,
      timestamp: new Date(),
      ipAddress: 'N/A', // Would need to capture from API
    });
    return docRef.id;
  } catch (error) {
    console.error('Error logging audit event:', error);
    return null;
  }
}

/**
 * Fetch audit logs
 */
export async function fetchAuditLogs(firestore: Firestore, limit: number = 100): Promise<any[]> {
  try {
    const auditRef = collection(firestore, 'audit_logs');
    // Note: Would need to add ordering and limiting with proper query
    const auditSnap = await getDocs(auditRef);

    const logs: any[] = [];
    auditSnap.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs
      .sort((a, b) => {
        const aDate = a.timestamp?.toDate?.() || new Date(0);
        const bDate = b.timestamp?.toDate?.() || new Date(0);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}
