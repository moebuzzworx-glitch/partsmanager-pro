import { Firestore, collection, getDocs, query, where } from 'firebase/firestore';

export interface ClientAutoComplete {
  id: string;
  name: string;
  address?: string;
  nis?: string;
  nif?: string;
  rc?: string;
  art?: string;
  rib?: string;
}

export interface ProductAutoComplete {
  id: string;
  name: string;
  reference?: string;
  brand?: string;
  price?: number;
  purchasePrice?: number;
  stock?: number;
}

/**
 * Fetch all customers for autocomplete
 */
export async function getCustomersForAutoComplete(
  firestore: Firestore,
  userId: string
): Promise<ClientAutoComplete[]> {
  try {
    const customersRef = collection(firestore, 'customers');
    const q = query(customersRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const customers: ClientAutoComplete[] = [];
    querySnapshot.forEach((doc) => {
      customers.push({
        id: doc.id,
        name: doc.data().name || '',
        address: doc.data().address,
        nis: doc.data().nis,
        nif: doc.data().nif,
        rc: doc.data().rc,
        art: doc.data().art,
        rib: doc.data().rib,
      });
    });

    return customers.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching customers for autocomplete:', error);
    return [];
  }
}

/**
 * Fetch all products for autocomplete
 */
export async function getProductsForAutoComplete(
  firestore: Firestore,
  userId: string
): Promise<ProductAutoComplete[]> {
  try {
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef, where('userId', '==', userId), where('isDeleted', '==', false));
    const querySnapshot = await getDocs(q);

    const products: ProductAutoComplete[] = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        name: doc.data().name || '',
        reference: doc.data().reference,
        brand: doc.data().brand,
        price: doc.data().price,
        purchasePrice: doc.data().purchasePrice,
        stock: doc.data().stock,
      });
    });

    return products.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching products for autocomplete:', error);
    return [];
  }
}
