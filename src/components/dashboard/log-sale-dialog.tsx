
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
import { PlusCircle, Trash2, ChevronDown } from 'lucide-react';
import { getDictionary } from '@/lib/dictionaries';
import type { Product, Contact } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { useFirebase } from '@/firebase/provider';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { TrialButtonLock } from '@/components/trial-button-lock';

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
  const { firestore, user } = useFirebase();
  const [open, setOpen] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerInput, setCustomerInput] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productInput, setProductInput] = useState<string>('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch products and customers from Firestore when dialog opens
  useEffect(() => {
    if (!open || !firestore) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch products (only non-deleted)
        const productsRef = collection(firestore, 'products');
        const productsSnapshot = await getDocs(query(productsRef, where('isDeleted', '==', false)));
        const fetchedProducts: Product[] = [];
        productsSnapshot.forEach(doc => {
          const data = doc.data();
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

  // Filter products based on input (by name or reference)
  const filteredProducts = useMemo(() => {
    if (!productInput.trim()) return products;
    const lowerInput = productInput.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerInput) || 
      p.reference.toLowerCase().includes(lowerInput)
    );
  }, [products, productInput]);

  const handleAddProduct = (product: Product) => {
    if (!saleItems.find(item => item.id === product.id)) {
      setSaleItems(prev => [...prev, { ...product, saleQuantity: 1 }]);
      setProductInput('');
      setShowProductDropdown(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerInput(customer.name);
    setShowCustomerDropdown(false);
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
    <TrialButtonLock user={user}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {d.logSale}
          </Button>
        </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[900px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{d.title}</DialogTitle>
          <DialogDescription>{d.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Customer Field with Autocomplete */}
          <div className="grid gap-3">
            <Label htmlFor="customer" className="text-base font-semibold">{d.customer}</Label>
            <div className="relative">
              <Input
                id="customer"
                type="text"
                placeholder={d.customerPlaceholder}
                value={customerInput}
                onChange={(e) => {
                  setCustomerInput(e.target.value);
                  setShowCustomerDropdown(true);
                  if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                    setSelectedCustomer(undefined);
                  }
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full"
              />
              {/* Customer Dropdown - Theme Styled */}
              {showCustomerDropdown && customerInput.trim() && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary/20 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="px-4 py-3 hover:bg-primary/10 cursor-pointer text-sm transition-colors border-b border-primary/10 last:border-b-0 flex justify-between items-center"
                    >
                      <span className="font-medium text-foreground">{customer.name}</span>
                      {customer.phone && <span className="text-xs text-muted-foreground">{customer.phone}</span>}
                    </div>
                  ))}
                </div>
              )}
              {showCustomerDropdown && customerInput.trim() && filteredCustomers.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary/20 rounded-md shadow-lg px-4 py-3 text-sm text-muted-foreground z-50">
                  {d.noCustomerFound}
                </div>
              )}
            </div>
            {customerInput.trim() && !selectedCustomer && (
              <p className="text-xs text-primary font-medium">✓ {customerInput} - {d.newCustomer}</p>
            )}
          </div>

          {/* Product Field with Autocomplete */}
          <div className="grid gap-3">
            <Label htmlFor="product" className="text-base font-semibold">{d.product}</Label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="product"
                    type="text"
                    placeholder={d.productPlaceholder}
                    value={productInput}
                    onChange={(e) => {
                      setProductInput(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full"
                  />
                  {/* Product Dropdown - Theme Styled */}
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary/20 rounded-md shadow-lg z-50 max-h-56 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleAddProduct(product)}
                          className="px-4 py-3 hover:bg-primary/10 cursor-pointer text-sm transition-colors border-b border-primary/10 last:border-b-0"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">Ref: {product.reference} • Stock: {product.stock}</p>
                            </div>
                            <p className="font-semibold text-primary whitespace-nowrap">{product.price.toFixed(2)} {dictionary.dashboard?.currency || 'DZD'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showProductDropdown && productInput.trim() && filteredProducts.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary/20 rounded-md shadow-lg px-4 py-3 text-sm text-muted-foreground z-50">
                      {d.noProductFound}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sale Items Table */}
          {saleItems.length > 0 && (
            <Card className="border-primary/20">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-primary/5">
                    <TableRow className="border-primary/10">
                      <TableHead className="font-semibold text-primary">{d.product}</TableHead>
                      <TableHead className="font-semibold text-primary w-[100px]">{d.quantity}</TableHead>
                      <TableHead className="font-semibold text-primary text-right w-[120px]">{d.price}</TableHead>
                      <TableHead className="font-semibold text-primary text-right w-[120px]">{d.total}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item, index) => (
                      <TableRow key={item.id} className={index % 2 === 0 ? 'bg-primary/[0.02]' : ''}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{item.name}</p>
                            <p className="text-xs text-muted-foreground">Ref: {item.reference}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.saleQuantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10))}
                            className="w-full text-center"
                            min="0"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.price.toFixed(2)} {dictionary.dashboard?.currency || 'DZD'}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{(item.price * item.saleQuantity).toFixed(2)} {dictionary.dashboard?.currency || 'DZD'}</TableCell>
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

          {/* Total Amount */}
          {saleItems.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex justify-between items-center">
              <span className="text-lg font-semibold text-foreground">{d.total}:</span>
              <span className="text-2xl font-bold text-primary">{totalAmount.toFixed(2)} {dictionary.dashboard?.currency || 'DZD'}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!customerInput.trim() || saleItems.length === 0} className="w-full">
            {d.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TrialButtonLock>
  );
}
