import { Firestore, collection, getDocs, query } from 'firebase/firestore';
import type { StoredInvoice } from './invoices-utils';

export interface KPIMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalSalesToday: number;
  totalProducts: number;
  lowStockItems: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalSales: number;
}

/**
 * Calculate total revenue from:
 * 1. Paid invoices (non-proforma)
 * 2. Sales transactions
 */
async function calculateTotalRevenue(firestore: Firestore): Promise<number> {
  let revenue = 0;

  try {
    // Revenue from paid invoices (non-proforma only)
    const invoicesRef = collection(firestore, 'invoices');
    const invoicesSnap = await getDocs(query(invoicesRef));
    
    invoicesSnap.forEach((doc) => {
      const invoice = doc.data() as StoredInvoice;
      // Only count non-proforma, paid invoices
      if (!invoice.isProforma && invoice.paid && invoice.total) {
        revenue += invoice.total;
      }
    });

    // Revenue from sales transactions
    const salesRef = collection(firestore, 'sales');
    const salesSnap = await getDocs(query(salesRef));
    
    salesSnap.forEach((doc) => {
      const sale = doc.data();
      const amount = sale.amount || 0;
      revenue += amount;
    });

  } catch (error) {
    console.error('Error calculating total revenue:', error);
  }

  return revenue;
}

/**
 * Calculate total expenses from:
 * 1. Stock additions (purchases)
 * 2. Purchase orders
 * 3. Updates to existing products (treated as additional cost)
 */
async function calculateTotalExpenses(firestore: Firestore): Promise<number> {
  let expenses = 0;

  try {
    // Expenses from purchase orders
    const purchasesRef = collection(firestore, 'purchases');
    const purchasesSnap = await getDocs(query(purchasesRef));
    
    purchasesSnap.forEach((doc) => {
      const purchase = doc.data();
      const totalAmount = purchase.totalAmount || 0;
      expenses += totalAmount;
    });

    // Expenses from stock additions (products added to inventory)
    // Each product addition is a cost
    const productsRef = collection(firestore, 'products');
    const productsSnap = await getDocs(query(productsRef));
    
    productsSnap.forEach((doc) => {
      const product = doc.data();
      // Cost = quantity * purchase price (if available)
      if (product.stock && product.purchasePrice) {
        const cost = product.stock * product.purchasePrice;
        expenses += cost;
      } else if (product.stock && product.unitPrice) {
        // Fallback: use unit price if purchase price not available
        const cost = product.stock * product.unitPrice;
        expenses += cost;
      }
    });

  } catch (error) {
    console.error('Error calculating total expenses:', error);
  }

  return expenses;
}

/**
 * Get sales count for today
 */
async function getSalesToday(firestore: Firestore): Promise<number> {
  let salesToday = 0;
  const today = new Date().toDateString();

  try {
    const salesRef = collection(firestore, 'sales');
    const salesSnap = await getDocs(query(salesRef));
    
    salesSnap.forEach((doc) => {
      const data = doc.data();
      const saleDate = data.date
        ? typeof data.date === 'string'
          ? new Date(data.date).toDateString()
          : data.date.toDate?.().toDateString?.()
        : null;

      if (saleDate === today) {
        salesToday++;
      }
    });
  } catch (error) {
    console.error('Error getting sales for today:', error);
  }

  return salesToday;
}

/**
 * Get total product count
 */
async function getTotalProducts(firestore: Firestore): Promise<number> {
  try {
    const productsRef = collection(firestore, 'products');
    const productsSnap = await getDocs(query(productsRef));
    // Only count non-deleted products
    let count = 0;
    productsSnap.forEach(doc => {
      if (doc.data().isDeleted !== true) {
        count++;
      }
    });
    return count;
  } catch (error) {
    console.error('Error getting total products:', error);
    return 0;
  }
}

/**
 * Get low stock items count
 */
async function getLowStockItems(firestore: Firestore): Promise<number> {
  try {
    const productsRef = collection(firestore, 'products');
    const productsSnap = await getDocs(query(productsRef));
    let count = 0;
    
    productsSnap.forEach(doc => {
      const product = doc.data();
      // Count if stock is low and product is not deleted
      if (product.isDeleted !== true && (product.stock || 0) < 10) {
        count++;
      }
    });
    
    return count;
  } catch (error) {
    console.error('Error getting low stock items:', error);
    return 0;
  }
}

/**
 * Get count of paid invoices
 */
async function getPaidInvoicesCount(firestore: Firestore): Promise<number> {
  try {
    const invoicesRef = collection(firestore, 'invoices');
    const invoicesSnap = await getDocs(query(invoicesRef));
    let count = 0;
    
    invoicesSnap.forEach(doc => {
      const invoice = doc.data();
      // Count non-proforma paid invoices
      if (!invoice.isProforma && invoice.paid === true) {
        count++;
      }
    });
    
    return count;
  } catch (error) {
    console.error('Error getting paid invoices count:', error);
    return 0;
  }
}

/**
 * Get count of unpaid invoices
 */
async function getUnpaidInvoicesCount(firestore: Firestore): Promise<number> {
  try {
    const invoicesRef = collection(firestore, 'invoices');
    const invoicesSnap = await getDocs(query(invoicesRef));
    let count = 0;
    
    invoicesSnap.forEach(doc => {
      const invoice = doc.data();
      // Count non-proforma unpaid invoices
      if (!invoice.isProforma && invoice.paid !== true) {
        count++;
      }
    });
    
    return count;
  } catch (error) {
    console.error('Error getting unpaid invoices count:', error);
    return 0;
  }
}

/**
 * Get total sales count (all sales transactions)
 */
async function getTotalSalesCount(firestore: Firestore): Promise<number> {
  try {
    const salesRef = collection(firestore, 'sales');
    const salesSnap = await getDocs(query(salesRef));
    return salesSnap.size;
  } catch (error) {
    console.error('Error getting total sales count:', error);
    return 0;
  }
}

/**
 * Fetch all KPI metrics comprehensively
 */
export async function fetchKPIMetrics(firestore: Firestore): Promise<KPIMetrics> {
  try {
    const [
      totalRevenue,
      totalExpenses,
      totalSalesToday,
      totalProducts,
      lowStockItems,
      paidInvoices,
      unpaidInvoices,
      totalSales,
    ] = await Promise.all([
      calculateTotalRevenue(firestore),
      calculateTotalExpenses(firestore),
      getSalesToday(firestore),
      getTotalProducts(firestore),
      getLowStockItems(firestore),
      getPaidInvoicesCount(firestore),
      getUnpaidInvoicesCount(firestore),
      getTotalSalesCount(firestore),
    ]);

    const netProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      totalSalesToday,
      totalProducts,
      lowStockItems,
      paidInvoices,
      unpaidInvoices,
      totalSales,
    };
  } catch (error) {
    console.error('Error fetching KPI metrics:', error);
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalSalesToday: 0,
      totalProducts: 0,
      lowStockItems: 0,
      paidInvoices: 0,
      unpaidInvoices: 0,
      totalSales: 0,
    };
  }
}
