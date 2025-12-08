import { Timestamp } from "firebase/firestore";

export type Product = {
  id: string;
  name: string; // Designation
  reference: string; // Référence
  brand: string; // Marque
  stock: number; // Qté Reservée
  purchasePrice: number; // PRIX ACHAT
  price: number; // Selling price
  image?: string;
  deletedAt?: Timestamp | null;
};

export type Supplier = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
};

export type Customer = {
  id:string;
  name: string;
  phone: string;
  email: string;
};

type OrderItem = {
  productId: string;
  quantity: number;
  price: number; // Price at the time of transaction
};

export type Purchase = {
  id: string;
  supplierId: string;
  date: Date;
  items: OrderItem[];
  total: number;
};

export type Sale = {
  id: string;
  customerId: string;
  date: Date;
  items: OrderItem[];
  total: number;
};
