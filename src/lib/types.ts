import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "user";
export type UserSubscription = "trial" | "premium" | "expired";
export type AuthMethod = "google" | "email";

export type User = {
  uid: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: UserRole;
  subscription: UserSubscription;
  emailVerified: boolean;
  authMethod: AuthMethod;
  createdAt: Timestamp;
  trialStartDate?: Timestamp;
  verificationSentAt?: Timestamp;
};

export type Product = {
  id: string;
  name: string; // Designation
  reference: string; // Référence
  brand: string; // Marque
  sku?: string; // SKU
  stock: number; // Qté Reservée
  purchasePrice: number; // PRIX ACHAT
  price: number; // Selling price
  image?: string;
  imageUrl?: string;
  imageHint?: string;
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

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export type Transaction = {
  id: string;
  date: Date;
  type: 'sale' | 'purchase';
  total: number;
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

