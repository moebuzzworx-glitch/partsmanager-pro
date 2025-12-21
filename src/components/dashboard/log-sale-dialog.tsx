
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { getDictionary } from '@/lib/dictionaries';
import type { Product, Contact } from '@/lib/types';
import { Autocomplete, AutocompleteOption } from './autocomplete';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { useFirebase } from '@/firebase/provider';
import { collection, getDocs, query, addDoc, serverTimestamp } from 'firebase/firestore';

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface SaleItem extends Product {
  saleQuantity: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export function LogSaleDialog({ dictionary, onSaleAdded }: { dictionary: Dictionary; onSaleAdded?: () => void }) {
  const d = dictionary.logSaleDialog;
  const { firestore } = useFirebase();
  const [open, setOpen] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerInput, setCustomerInput] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch products and customers from Firestore when dialog opens
  useEffect(() => {
    if (!open || !firestore) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch products
        const productsRef = collection(firestore, 'products');
        const productsSnapshot = await getDocs(query(productsRef));
        const fetchedProducts: Product[] = [];
        productsSnapshot.forEach(doc => {
          const data = doc.data();
          // Skip deleted products
          if (data.isDeleted) return;
          
          fetchedProducts.push({
            id: doc.id,
            name: data.name || '',
            reference: data.reference || '',
            brand: data.brand || '',
            sku: data.sku || '',
            stock: data.stock || 0,
            purchasePrice: data.purchasePrice || 0,
            price: data.price || 0,
          });
        });
        setProducts(fetchedProducts);

        // Fetch customers
        const customersRef = collection(firestore, 'customers');
        const customersSnapshot = await getDocs(query(customersRef));
        const fetchedCustomers: Customer[] = [];
        customersSnapshot.forEach(doc => {
          fetchedCustomers.push({
            id: doc.id,
            name: doc.data().name || '',
            email: doc.data().email || '',
            phone: doc.data().phone || '',
          });
        });
        setCustomers(fetchedCustomers);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, firestore]);

  // Filter customers based on input
  const filteredCustomers = useMemo(() => {
    if (!customerInput.trim()) return customers;
    const lowerInput = customerInput.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(lowerInput));
  }, [customers, customerInput]);

  const productOptions = useMemo(() => products.map(p => ({ value: p.id, label: `${p.name} (${p.reference})` })), [products]);
  const customerOptions = useMemo(() => filteredCustomers.map(c => ({ value: c.id, label: c.name })), [filteredCustomers]);

  const handleAddProduct = (option: AutocompleteOption) => {
    const product = products.find(p => p.id === option.value);
    if (product && !saleItems.find(item => item.id === product.id)) {
      setSaleItems(prev => [...prev, { ...product, saleQuantity: 1 }]);
    }
  };

  const handleCustomerSelect = (option: AutocompleteOption) => {
    const customer = customers.find(c => c.id === option.value);
    if (customer) {
      setSelectedCustomer(customer);
      setCustomerInput(customer.name);
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    setSaleItems(prev => prev.map(item => item.id === productId ? { ...item, saleQuantity: newQuantity } : item));
  };

  const handleRemoveItem = (productId: string) => {
    setSaleItems(prev => prev.filter(item => item.id !== productId));
  };
  
  const totalAmount = useMemo(() => {
    return saleItems.reduce((total, item) => total + (item.price * item.saleQuantity), 0);
  }, [saleItems]);

  const handleSubmit = async () => {
    if (!firestore || !customerInput.trim() || saleItems.length === 0) return;

    try {
      let customerId = selectedCustomer?.id;
      let customerName = customerInput.trim();

      // Create new customer if not selected from list
      if (!selectedCustomer) {
        const customerRef = collection(firestore, 'customers');
        const newCustomerDoc = await addDoc(customerRef, {
          name: customerName,
          email: '',
          phone: '',
          createdAt: serverTimestamp(),
        });
        customerId = newCustomerDoc.id;
      }

      // Save each sale item to the sales collection
      const salesRef = collection(firestore, 'sales');
      for (const item of saleItems) {
        await addDoc(salesRef, {
          customerId: customerId,
          customer: customerName,
          productId: item.id,
          product: item.name,
          quantity: item.saleQuantity,
          amount: item.price * item.saleQuantity,
          unitPrice: item.price,
          reference: item.reference,
          date: serverTimestamp(),
        });
      }

      // Reset form
      setOpen(false);
      setSaleItems([]);
      setCustomerInput('');
      setSelectedCustomer(undefined);
      onSaleAdded?.();
    } catch (error) {
      console.error('Error saving sale:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" />
          {d.logSale}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{d.title}</DialogTitle>
          <DialogDescription>{d.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="customer">{d.customer}</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                        type="text"
                        placeholder={d.customerPlaceholder}
                        value={customerInput}
                        onChange={(e) => {
                          setCustomerInput(e.target.value);
                          // Clear selection if user is typing
                          if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                            setSelectedCustomer(undefined);
                          }
                        }}
                        className="w-full"
                    />
                    {/* Show dropdown suggestions */}
                    {customerInput.trim() && customerOptions.length > 0 && (
                      <div className="border border-t-0 rounded-b bg-white mt-0 max-h-48 overflow-y-auto z-50">
                        {customerOptions.map((option) => (
                          <div
                            key={option.value}
                            onClick={() => handleCustomerSelect(option)}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                    {customerInput.trim() && customerOptions.length === 0 && (
                      <div className="border border-t-0 rounded-b bg-white mt-0 px-3 py-2 text-sm text-gray-500">
                        {d.noCustomerFound}
                      </div>
                    )}
                  </div>
                </div>
                {customerInput.trim() && !selectedCustomer && (
                  <p className="text-xs text-blue-600">{customerInput} - {d.newCustomer}</p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="product">{d.product}</Label>
                <Autocomplete
                    options={productOptions}
                    placeholder={d.productPlaceholder}
                    emptyMessage={d.noProductFound}
                    onValueChange={handleAddProduct}
                />
            </div>
          
          {saleItems.length > 0 && (
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{d.product}</TableHead>
                                <TableHead className="w-[120px]">{d.quantity}</TableHead>
                                <TableHead className="text-right w-[120px]">{d.price}</TableHead>
                                <TableHead className="text-right w-[120px]">{d.total}</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {saleItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            value={item.saleQuantity}
                                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10))}
                                            className="w-full"
                                            min="0"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">{item.price.toFixed(2)} DZD</TableCell>
                                    <TableCell className="text-right">{(item.price * item.saleQuantity).toFixed(2)} DZD</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          )}

          <div className="flex justify-end font-bold text-lg">
            <span>{d.total}: {totalAmount.toFixed(2)} DZD</span>
          </div>

        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!customerInput.trim() || saleItems.length === 0}>
            {d.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
