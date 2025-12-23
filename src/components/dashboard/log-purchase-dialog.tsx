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

interface PurchaseItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export function LogPurchaseDialog({ dictionary, onPurchaseAdded }: { dictionary: Dictionary; onPurchaseAdded?: () => void }) {
  const d = dictionary.logPurchaseDialog;
  const { firestore } = useFirebase();
  const [open, setOpen] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [supplierInput, setSupplierInput] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentItemDescription, setCurrentItemDescription] = useState('');
  const [currentItemQuantity, setCurrentItemQuantity] = useState(1);
  const [currentItemPrice, setCurrentItemPrice] = useState(0);

  // Fetch suppliers from Firestore when dialog opens
  useEffect(() => {
    if (!open || !firestore) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch suppliers
        const suppliersRef = collection(firestore, 'suppliers');
        const suppliersSnapshot = await getDocs(query(suppliersRef));
        const fetchedSuppliers: Supplier[] = [];
        suppliersSnapshot.forEach(doc => {
          fetchedSuppliers.push({
            id: doc.id,
            name: doc.data().name || '',
            email: doc.data().email || '',
            phone: doc.data().phone || '',
          });
        });
        setSuppliers(fetchedSuppliers);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, firestore]);

  // Filter suppliers based on input
  const filteredSuppliers = useMemo(() => {
    if (!supplierInput.trim()) return suppliers;
    const lowerInput = supplierInput.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(lowerInput));
  }, [suppliers, supplierInput]);

  const supplierOptions = useMemo(() => filteredSuppliers.map(s => ({ value: s.id, label: s.name })), [filteredSuppliers]);

  const handleAddItem = () => {
    if (!currentItemDescription.trim() || currentItemQuantity <= 0 || currentItemPrice <= 0) {
      return;
    }

    setPurchaseItems(prev => [...prev, {
      description: currentItemDescription.trim(),
      quantity: currentItemQuantity,
      unitPrice: currentItemPrice,
    }]);

    // Reset form
    setCurrentItemDescription('');
    setCurrentItemQuantity(1);
    setCurrentItemPrice(0);
  };

  const handleSupplierSelect = (option: AutocompleteOption) => {
    const supplier = suppliers.find(s => s.id === option.value);
    if (supplier) {
      setSelectedSupplier(supplier);
      setSupplierInput(supplier.name);
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    setPurchaseItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: newQuantity } : item));
  };

  const handlePriceChange = (index: number, price: number) => {
    const newPrice = Math.max(0, price);
    setPurchaseItems(prev => prev.map((item, i) => i === index ? { ...item, unitPrice: newPrice } : item));
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const totalAmount = useMemo(() => {
    return purchaseItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  }, [purchaseItems]);

  const handleSubmit = async () => {
    if (!firestore || !supplierInput.trim() || purchaseItems.length === 0) return;

    try {
      let supplierId = selectedSupplier?.id;
      let supplierName = supplierInput.trim();

      // Create new supplier if not selected from list
      if (!selectedSupplier) {
        const supplierRef = collection(firestore, 'suppliers');
        const newSupplierDoc = await addDoc(supplierRef, {
          name: supplierName,
          email: '',
          phone: '',
          createdAt: serverTimestamp(),
        });
        supplierId = newSupplierDoc.id;
      }

      // Save purchase to purchases collection
      const purchasesRef = collection(firestore, 'purchases');
      await addDoc(purchasesRef, {
        supplierId: supplierId,
        supplier: supplierName,
        items: purchaseItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        })),
        totalAmount: totalAmount,
        date: serverTimestamp(),
      });

      // Reset form
      setOpen(false);
      setPurchaseItems([]);
      setSupplierInput('');
      setSelectedSupplier(undefined);
      setCurrentItemDescription('');
      setCurrentItemQuantity(1);
      setCurrentItemPrice(0);
      onPurchaseAdded?.();
    } catch (error) {
      console.error('Error saving purchase:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" />
          {d.logPurchase}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{d.title}</DialogTitle>
          <DialogDescription>{d.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="supplier">{d.supplier}</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                        type="text"
                        placeholder={d.supplierPlaceholder}
                        value={supplierInput}
                        onChange={(e) => {
                          setSupplierInput(e.target.value);
                          // Clear selection if user is typing
                          if (selectedSupplier && e.target.value !== selectedSupplier.name) {
                            setSelectedSupplier(undefined);
                          }
                        }}
                        className="w-full"
                    />
                    {/* Show dropdown suggestions */}
                    {supplierInput.trim() && supplierOptions.length > 0 && (
                      <div className="border border-t-0 rounded-b bg-background mt-0 max-h-48 overflow-y-auto z-50">
                        {supplierOptions.map((option) => (
                          <div
                            key={option.value}
                            onClick={() => handleSupplierSelect(option)}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                    {supplierInput.trim() && supplierOptions.length === 0 && (
                      <div className="border border-t-0 rounded-b bg-background mt-0 px-3 py-2 text-sm text-gray-500">
                        {d.noSupplierFound}
                      </div>
                    )}
                  </div>
                </div>
                {supplierInput.trim() && !selectedSupplier && (
                  <p className="text-xs text-blue-600">{supplierInput} - {d.newSupplier}</p>
                )}
            </div>

            <div className="grid gap-4 border rounded-lg p-4 bg-gray-50 dark:bg-slate-900">
              <div className="grid gap-2">
                <Label htmlFor="item-description">{d.itemDescription}</Label>
                <Input
                    type="text"
                    id="item-description"
                    placeholder={d.itemDescriptionPlaceholder}
                    value={currentItemDescription}
                    onChange={(e) => setCurrentItemDescription(e.target.value)}
                    className="w-full"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="item-quantity">{d.quantity}</Label>
                  <Input 
                      type="number" 
                      id="item-quantity"
                      value={currentItemQuantity}
                      onChange={(e) => setCurrentItemQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full"
                      min="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-price">{d.price}</Label>
                  <Input 
                      type="number" 
                      id="item-price"
                      value={currentItemPrice}
                      onChange={(e) => setCurrentItemPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full"
                      min="0"
                      step="0.01"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <Button onClick={handleAddItem} className="w-full">
                    {d.addItem}
                  </Button>
                </div>
              </div>
            </div>

          {purchaseItems.length > 0 && (
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{d.itemDescription}</TableHead>
                                <TableHead className="w-[100px]">{d.quantity}</TableHead>
                                <TableHead className="text-right w-[120px]">{d.price}</TableHead>
                                <TableHead className="text-right w-[120px]">{d.total}</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseItems.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value, 10))}
                                            className="w-full"
                                            min="0"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input 
                                            type="number" 
                                            value={item.unitPrice}
                                            onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                                            className="w-full text-right"
                                            min="0"
                                            step="0.01"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">{(item.unitPrice * item.quantity).toFixed(2)} DZD</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
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
          <Button onClick={handleSubmit} disabled={!supplierInput.trim() || purchaseItems.length === 0}>
            {d.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
