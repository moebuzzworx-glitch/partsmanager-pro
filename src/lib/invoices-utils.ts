import { Firestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import type { InvoiceFormData } from '@/components/dashboard/create-invoice-form';
import type { CompanyInfo } from '@/components/dashboard/document-generator';

export interface StoredInvoice {
  id?: string;
  userId: string;
  invoiceNumber: string;
  invoiceDate: string;
  documentType?: 'INVOICE' | 'DELIVERY_NOTE' | 'PURCHASE_ORDER' | 'SALES_RECEIPT';
  isProforma: boolean;
  clientName: string;
  clientAddress?: string;
  clientNis?: string;
  clientNif?: string;
  clientRc?: string;
  clientArt?: string;
  clientRib?: string;
  lineItems: Array<{
    reference?: string;
    designation: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod?: string;
  applyVatToAll: boolean;
  companyInfo?: CompanyInfo;
  defaultVat?: number;
  total?: number;
  subtotal?: number;
  vatAmount?: number;
  paid: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Save invoice data to Firestore (not PDF)
 */
export async function saveInvoiceData(
  firestore: Firestore,
  userId: string,
  invoiceData: InvoiceFormData,
  companyInfo?: CompanyInfo,
  defaultVat?: number,
  total?: number,
  subtotal?: number,
  vatAmount?: number,
  documentType: 'INVOICE' | 'DELIVERY_NOTE' | 'PURCHASE_ORDER' | 'SALES_RECEIPT' = 'INVOICE'
): Promise<string> {
  try {
    const invoicesRef = collection(firestore, 'invoices');

    const storedInvoice: StoredInvoice = {
      userId,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      documentType,
      isProforma: invoiceData.isProforma,
      clientName: invoiceData.clientName,
      clientAddress: invoiceData.clientAddress,
      clientNis: invoiceData.clientNis,
      clientNif: invoiceData.clientNif,
      clientRc: invoiceData.clientRc,
      clientArt: invoiceData.clientArt,
      clientRib: invoiceData.clientRib,
      lineItems: invoiceData.lineItems,
      paymentMethod: invoiceData.paymentMethod,
      applyVatToAll: invoiceData.applyVatToAll,
      companyInfo,
      defaultVat,
      total,
      subtotal,
      vatAmount,
      paid: false,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(invoicesRef, storedInvoice);
    return docRef.id;
  } catch (error) {
    console.error('Error saving invoice data:', error);
    throw error;
  }
}

/**
 * Retrieve invoice data by ID
 */
export async function getInvoiceData(
  firestore: Firestore,
  invoiceId: string
): Promise<StoredInvoice | null> {
  try {
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    const invoiceSnap = await firestore.getDoc?.(invoiceRef) || (await import('firebase/firestore').then(mod => mod.getDoc(invoiceRef)));

    if (!invoiceSnap?.exists()) {
      return null;
    }

    return {
      id: invoiceSnap.id,
      ...invoiceSnap.data(),
    } as StoredInvoice;
  } catch (error) {
    console.error('Error retrieving invoice data:', error);
    return null;
  }
}

/**
 * Get all invoices for a user
 */
export async function getUserInvoices(
  firestore: Firestore,
  userId: string
): Promise<StoredInvoice[]> {
  try {
    const invoicesRef = collection(firestore, 'invoices');
    const q = query(invoicesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const invoices: StoredInvoice[] = [];
    querySnapshot.forEach((doc) => {
      invoices.push({
        id: doc.id,
        ...doc.data(),
      } as StoredInvoice);
    });

    // Sort by date descending
    invoices.sort((a, b) => {
      const dateA = new Date(a.invoiceDate).getTime();
      const dateB = new Date(b.invoiceDate).getTime();
      return dateB - dateA;
    });

    return invoices;
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return [];
  }
}

/**
 * Delete invoice record
 */
export async function deleteInvoice(
  firestore: Firestore,
  invoiceId: string
): Promise<boolean> {
  try {
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    await deleteDoc(invoiceRef);
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
}

/**
 * Calculate invoice totals
 */
export function calculateInvoiceTotals(
  lineItems: Array<{ quantity: number; unitPrice: number }>,
  applyVat: boolean,
  vatRate: number = 19
): { subtotal: number; vatAmount: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vatAmount = applyVat ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vatAmount;

  return { subtotal, vatAmount, total };
}

/**
 * Update invoice paid status
 */
export async function updateInvoicePaidStatus(
  firestore: Firestore,
  invoiceId: string,
  paid: boolean
): Promise<boolean> {
  try {
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      paid,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating invoice paid status:', error);
    return false;
  }
}

/**
 * Update invoice details
 */
export async function updateInvoice(
  firestore: Firestore,
  invoiceId: string,
  invoiceData: Partial<StoredInvoice>
): Promise<boolean> {
  try {
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      ...invoiceData,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating invoice:', error);
    return false;
  }
}

/**
 * Deduct stock quantities from products based on invoice line items
 * Called when invoice is created (non-proforma only)
 */
export async function deductStockFromInvoice(
  firestore: Firestore,
  invoice: StoredInvoice
): Promise<boolean> {
  try {
    // Only deduct stock for non-proforma invoices and non-purchase-orders
    if (invoice.isProforma || invoice.documentType === 'PURCHASE_ORDER') {
      return true;
    }

    // For each line item, deduct from product stock
    for (const lineItem of invoice.lineItems) {
      const productsRef = collection(firestore, 'products');

      // Find product by reference or designation
      let querySnapshot;
      if (lineItem.reference) {
        const q = query(
          productsRef,
          where('reference', '==', lineItem.reference)
        );
        querySnapshot = await getDocs(q);
      } else {
        const q = query(
          productsRef,
          where('name', '==', lineItem.designation)
        );
        querySnapshot = await getDocs(q);
      }

      if (!querySnapshot.empty) {
        const productDoc = querySnapshot.docs[0];
        const productData = productDoc.data();
        const currentStock = productData.stock || 0;
        const newStock = Math.max(0, currentStock - lineItem.quantity);

        await updateDoc(productDoc.ref, {
          stock: newStock,
          updatedAt: serverTimestamp(),
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error deducting stock from invoice:', error);
    return false;
  }
}
