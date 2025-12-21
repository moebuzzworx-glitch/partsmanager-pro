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
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  systemStatus: 'healthy' | 'warning' | 'error';
}

export interface SalesMetrics {
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface InventoryMetrics {
  productName: string;
  stock: number;
  purchasePrice: number;
  value: number;
}

export interface UserMetrics {
  email: string;
  role: string;
  createdAt: any;
  lastLogin?: any;
}

/**
 * Fetch comprehensive analytics data for admin dashboard
 */
export async function fetchAnalyticsData(firestore: Firestore): Promise<AnalyticsData> {
  try {
    // Fetch all sales to calculate revenue and order count
    const salesRef = collection(firestore, 'sales');
    const salesSnap = await getDocs(salesRef);
    
    let totalRevenue = 0;
    let totalOrders = 0;
    const salesByDate: { [key: string]: { revenue: number; count: number } } = {};
    
    salesSnap.forEach(doc => {
      const data = doc.data();
      const amount = data.amount || 0;
      const quantity = data.quantity || 1;
      totalRevenue += amount;
      totalOrders++;
      
      // Track by date for trends
      const date = data.saleDate ? new Date(data.saleDate.toDate()).toISOString().split('T')[0] : 'unknown';
      if (!salesByDate[date]) {
        salesByDate[date] = { revenue: 0, count: 0 };
      }
      salesByDate[date].revenue += amount;
      salesByDate[date].count++;
    });

    // Fetch all users
    const usersRef = collection(firestore, 'users');
    const usersSnap = await getDocs(usersRef);
    const activeUsers = usersSnap.size;

    // Fetch all products and calculate metrics
    const productsRef = collection(firestore, 'products');
    const productsSnap = await getDocs(productsRef);
    const totalProducts = productsSnap.size;
    
    let lowStockProducts = 0;
    let totalInventoryValue = 0;
    
    productsSnap.forEach(doc => {
      const data = doc.data();
      const stock = data.stock || 0;
      const purchasePrice = data.purchasePrice || 0;
      
      if (stock < 20) {
        lowStockProducts++;
      }
      totalInventoryValue += stock * purchasePrice;
    });

    // Fetch all customers
    const customersRef = collection(firestore, 'customers');
    const customersSnap = await getDocs(customersRef);
    const totalCustomers = customersSnap.size;

    // Fetch all suppliers
    const suppliersRef = collection(firestore, 'suppliers');
    const suppliersSnap = await getDocs(suppliersRef);
    const totalSuppliers = suppliersSnap.size;

    // Determine system status
    let systemStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (lowStockProducts > totalProducts * 0.2) {
      systemStatus = 'warning';
    }
    if (lowStockProducts > totalProducts * 0.5) {
      systemStatus = 'error';
    }

    return {
      totalRevenue,
      totalOrders,
      activeUsers,
      totalProducts,
      lowStockProducts,
      totalCustomers,
      totalSuppliers,
      systemStatus,
    };
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return {
      totalRevenue: 0,
      totalOrders: 0,
      activeUsers: 0,
      totalProducts: 0,
      lowStockProducts: 0,
      totalCustomers: 0,
      totalSuppliers: 0,
      systemStatus: 'error',
    };
  }
}

/**
 * Fetch sales metrics for chart data
 */
export async function fetchSalesMetrics(firestore: Firestore, days: number = 30): Promise<SalesMetrics[]> {
  try {
    const salesRef = collection(firestore, 'sales');
    const salesSnap = await getDocs(salesRef);
    
    const metricsMap: { [key: string]: { revenue: number; count: number } } = {};
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    salesSnap.forEach(doc => {
      const data = doc.data();
      const saleDate = data.saleDate ? new Date(data.saleDate.toDate()) : new Date();
      
      if (saleDate >= cutoffDate) {
        const dateKey = saleDate.toISOString().split('T')[0];
        if (!metricsMap[dateKey]) {
          metricsMap[dateKey] = { revenue: 0, count: 0 };
        }
        metricsMap[dateKey].revenue += data.amount || 0;
        metricsMap[dateKey].count++;
      }
    });

    return Object.entries(metricsMap)
      .map(([date, metrics]) => ({
        date,
        revenue: metrics.revenue,
        ordersCount: metrics.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    return [];
  }
}

/**
 * Fetch inventory metrics for low stock items
 */
export async function fetchInventoryMetrics(firestore: Firestore, threshold: number = 20): Promise<InventoryMetrics[]> {
  try {
    const productsRef = collection(firestore, 'products');
    const productsSnap = await getDocs(productsRef);
    
    const metrics: InventoryMetrics[] = [];
    
    productsSnap.forEach(doc => {
      const data = doc.data();
      if ((data.stock || 0) < threshold) {
        metrics.push({
          productName: data.name || doc.id,
          stock: data.stock || 0,
          purchasePrice: data.purchasePrice || 0,
          value: (data.stock || 0) * (data.purchasePrice || 0),
        });
      }
    });

    return metrics.sort((a, b) => a.stock - b.stock);
  } catch (error) {
    console.error('Error fetching inventory metrics:', error);
    return [];
  }
}

/**
 * Fetch user metrics
 */
export async function fetchUserMetrics(firestore: Firestore): Promise<UserMetrics[]> {
  try {
    const usersRef = collection(firestore, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const metrics: UserMetrics[] = [];
    
    usersSnap.forEach(doc => {
      const data = doc.data();
      metrics.push({
        email: data.email || 'Unknown',
        role: data.role || 'user',
        createdAt: data.createdAt,
        lastLogin: data.lastLogin,
      });
    });

    return metrics.sort((a, b) => {
      const aDate = a.createdAt?.toDate?.() || new Date(0);
      const bDate = b.createdAt?.toDate?.() || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
  } catch (error) {
    console.error('Error fetching user metrics:', error);
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
