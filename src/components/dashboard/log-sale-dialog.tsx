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
import { PlusCircle, Trash2, ChevronDown, ChevronUp, QrCode } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { TrialButtonLock } from '@/components/trial-button-lock';
import { hybridUpdateProduct } from '@/lib/hybrid-import-v2';

import { getCustomersForAutoComplete, getProductsForAutoComplete, type ClientAutoComplete, type ProductAutoComplete } from '@/lib/invoice-autocomplete-utils';
import { generateDocumentPdf } from '@/components/dashboard/document-generator';
import { getUserSettings } from '@/lib/settings-utils';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useScanSession } from '@/lib/scan-session-provider';
import { PairingCode } from '@/components/dashboard/scan/pairing-code';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScannerPairingDialog } from '@/components/dashboard/scan/scanner-pairing-dialog';

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface SaleItem extends ProductAutoComplete {
  saleQuantity: number;
  price: number;
}

export interface LogSaleDialogRef {
  handleScan: (productId: string) => void;
}

export const LogSaleDialog = React.forwardRef<LogSaleDialogRef, { dictionary: Dictionary; onSaleAdded?: () => void }>(({ dictionary, onSaleAdded }, ref) => {
  const d = dictionary.logSaleDialog;
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerInput, setCustomerInput] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<ClientAutoComplete | undefined>();
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productInput, setProductInput] = useState<string>('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [inputQuantity, setInputQuantity] = useState<number>(1);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [products, setProducts] = useState<ProductAutoComplete[]>([]);
  const [customers, setCustomers] = useState<ClientAutoComplete[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [appUser, setAppUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Scan Logic
  const [pendingScanId, setPendingScanId] = useState<string | null>(null);

  React.useImperativeHandle(ref, () => ({
    handleScan: (productId: string) => {
      setOpen(true);
      setPendingScanId(productId);
    }
  }));

  // Handle pending scan once products are loaded
  useEffect(() => {
    if (open && pendingScanId && products.length > 0) {
      const product = products.find(p => p.id === pendingScanId);
      if (product) {
        // Prevent adding if already dealing with quantity
        if (!saleItems.find(item => item.id === product.id)) {
          setSaleItems(prev => [...prev, {
            ...product,
            price: product.price || 0,
            saleQuantity: 1
          }]);
          toast({ title: "Product Scanned", description: `${product.name} added.` });
        } else {
          // Increment if already exists
          setSaleItems(prev => prev.map(item => item.id === product.id ? { ...item, saleQuantity: item.saleQuantity + 1 } : item));
          toast({ title: "Quantity Updated", description: `${product.name} +1` });
        }
      } else {
        toast({ title: "Product Not Found", description: "This product is not in your stock.", variant: "destructive" });
      }
      setPendingScanId(null);
    }
  }, [open, pendingScanId, products, saleItems, toast]);

  // Fetch products and customers from Firestore when dialog opens
  useEffect(() => {
    if (!open || !firestore || !user) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const [productsData, customersData, settingsData, userDocSnap] = await Promise.all([
          getProductsForAutoComplete(firestore, user.uid),
          getCustomersForAutoComplete(firestore, user.uid),
          getUserSettings(firestore, user.uid),
          getDoc(userDocRef)
        ]);
        setProducts(productsData);
        setCustomers(customersData);
        setSettings(settingsData);
        if (userDocSnap.exists()) {
          setAppUser(userDocSnap.data());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, firestore, user]);

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
      (p.reference && p.reference.toLowerCase().includes(lowerInput))
    );
  }, [products, productInput]);

  const handleAddProduct = (product: ProductAutoComplete) => {
    if (!saleItems.find(item => item.id === product.id)) {
      setSaleItems(prev => [...prev, {
        ...product,
        price: product.price || 0,
        saleQuantity: inputQuantity > 0 ? inputQuantity : 1
      }]);
      setProductInput('');
      setInputQuantity(1); // Reset quantity
      setShowProductDropdown(false);
    }
  };

  const handleCustomerSelect = (customer: ClientAutoComplete) => {
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

  const subTotal = useMemo(() => {
    return saleItems.reduce((total, item) => total + (item.price * item.saleQuantity), 0);
  }, [saleItems]);

  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === 'percentage') {
      return (subTotal * discountValue) / 100;
    }
    return discountValue;
  }, [subTotal, discountType, discountValue]);

  const totalAmount = Math.max(0, subTotal - discountAmount);

  const handleSubmit = async (autoPrint: boolean = false) => {
    if (!firestore || !customerInput.trim() || saleItems.length === 0 || isLoading) return;

    setIsLoading(true);
    try {
      let customerId = selectedCustomer?.id;
      let customerName = customerInput.trim();

      // Create new customer if not selected from list
      if (!selectedCustomer && user) {
        const customerRef = collection(firestore, 'customers');
        const newCustomerDoc = await addDoc(customerRef, {
          userId: user.uid,
          name: customerName,
          email: '',
          phone: '',
          version: 1,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        customerId = newCustomerDoc.id;
      }

      // Record items and generate document data... (reusing existing logic)
      const discountRatio = subTotal > 0 ? (subTotal - discountAmount) / subTotal : 1;
      const salesRef = collection(firestore, 'sales');
      for (const item of saleItems) {
        const currentStock = item.stock || 0;
        const newStock = Math.max(0, currentStock - item.saleQuantity);
        try { await hybridUpdateProduct(user, item.id, { stock: newStock }); } catch (err) { }

        const itemOriginalTotal = item.price * item.saleQuantity;
        const itemDiscountedTotal = itemOriginalTotal * discountRatio;
        const itemDiscountAmount = itemOriginalTotal - itemDiscountedTotal;

        await addDoc(salesRef, {
          userId: user?.uid,
          customerId: customerId,
          customer: customerName,
          productId: item.id,
          product: item.name,
          quantity: item.saleQuantity,
          amount: itemDiscountedTotal,
          originalAmount: itemOriginalTotal,
          discountAmount: itemDiscountAmount,
          unitPrice: item.price,
          reference: item.reference,
          version: 1,
          updatedAt: serverTimestamp(),
          date: serverTimestamp(),
        });
      }

      const receiptData = {
        invoiceNumber: `REC-${Date.now().toString().slice(-6)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        clientName: customerName,
        clientAddress: (selectedCustomer as any)?.address || '',
        clientNis: (selectedCustomer as any)?.nis || '',
        clientNif: (selectedCustomer as any)?.nif || '',
        clientRc: (selectedCustomer as any)?.rc || '',
        clientArt: (selectedCustomer as any)?.art || '',
        clientRib: (selectedCustomer as any)?.rib || '',
        lineItems: saleItems.map(item => ({
          reference: item.reference,
          designation: item.name,
          quantity: item.saleQuantity,
          unitPrice: item.price,
          unit: 'pcs'
        })),
        paymentMethod: 'Espèce',
        applyVatToAll: false,
        isProforma: false,
        discountType: discountType,
        discountValue: discountValue
      };

      const companyInfo = settings ? {
        companyName: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        logoUrl: settings.logoUrl,
        rc: settings.rc, nif: settings.nif, art: settings.art, nis: settings.nis, rib: settings.rib
      } : undefined;

      const handlePrintReceipt = () => {
        generateDocumentPdf(receiptData as any, 'SALES_RECEIPT', companyInfo as any, 0, false, 0, false, dictionary);
      };

      if (autoPrint) {
        handlePrintReceipt();
      }

      toast({
        title: d.title,
        description: d.saleRecorded || 'Sale recorded successfully.',
        action: (
          <ToastAction altText="Print Receipt" onClick={handlePrintReceipt}>
            {d.printReceipt || 'Print Receipt'}
          </ToastAction>
        ),
      });

      setOpen(false);
      setSaleItems([]);
      setCustomerInput('');
      setSelectedCustomer(undefined);
      setDiscountValue(0);
      onSaleAdded?.();
    } catch (error) {
      console.error('Error saving sale:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TrialButtonLock user={appUser}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="me-2 h-4 w-4" />
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
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary/20 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="px-4 py-3 hover:bg-primary/10 cursor-pointer text-sm transition-colors border-b border-primary/10 last:border-b-0 flex justify-between items-center"
                      >
                        <span className="font-medium text-foreground">{customer.name}</span>
                        {customer.address && <span className="text-xs text-muted-foreground">{customer.address}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {showCustomerDropdown && filteredCustomers.length === 0 && customerInput.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary/20 rounded-md shadow-lg px-4 py-3 text-sm text-muted-foreground z-50">
                    {d.noCustomerFound}
                  </div>
                )}
              </div>
              {customerInput.trim() && !selectedCustomer && (
                <p className="text-xs text-primary font-medium">✓ {customerInput} - {d.newCustomer}</p>
              )}
            </div>

            {/* Product Field with Autocomplete and Quantity */}
            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="product" className="text-base font-semibold">{d.product}</Label>
                <ScannerPairingDialog dictionary={dictionary} onScan={(productId) => setPendingScanId(productId)} />
              </div>
              <div className="flex gap-2">
                <div className="flex-[3] relative">
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
                    onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                    className="w-full"
                    autoComplete="off"
                  />
                  {/* Product Dropdown - Theme Styled */}
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary/20 rounded-md shadow-lg z-50 max-h-56 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          onMouseDown={() => handleAddProduct(product)}
                          className="px-4 py-3 hover:bg-primary/10 cursor-pointer text-sm transition-colors border-b border-primary/10 last:border-b-0"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.reference && `Ref: ${product.reference}`}
                                {product.stock !== undefined && ` • Stock: ${product.stock}`}
                              </p>
                            </div>
                            <p className="font-semibold text-primary whitespace-nowrap">
                              {(product.price || 0).toFixed(2)} {dictionary.dashboard?.currency || 'DZD'}
                            </p>
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
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder={d.quantity}
                    value={inputQuantity}
                    onChange={(e) => setInputQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Sale Items Table */}
            {saleItems.length > 0 && (
              <Card className="border-primary/20">
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-primary/5">
                      <TableRow className="border-primary/10">
                        <TableHead className="font-semibold text-primary">{d.product}</TableHead>
                        <TableHead className="font-semibold text-primary w-[100px]">{d.quantity}</TableHead>
                        <TableHead className="font-semibold text-primary text-end w-[120px]">{d.price}</TableHead>
                        <TableHead className="font-semibold text-primary text-end w-[120px]">{d.total}</TableHead>
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
                          <TableCell className="text-end font-medium">{item.price.toFixed(2)} {dictionary.dashboard?.currency || 'DZD'}</TableCell>
                          <TableCell className="text-end font-semibold text-primary">{(item.price * item.saleQuantity).toFixed(2)} {dictionary.dashboard?.currency || 'DZD'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Total and Discount Section */}
            {saleItems.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

                  {/* Discount Controls */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Label className="whitespace-nowrap font-medium">{(dictionary as any).createInvoiceForm?.discount || 'Discount'}:</Label>
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                      <Select
                        value={discountType}
                        onValueChange={(val: 'percentage' | 'amount') => setDiscountType(val)}
                      >
                        <SelectTrigger className="w-[110px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">{(dictionary as any).createInvoiceForm?.percentage || 'Percent (%)'}</SelectItem>
                          <SelectItem value="amount">{(dictionary as any).createInvoiceForm?.fixedAmount || 'Fixed'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        className="w-[100px] h-9"
                        placeholder="0"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="flex flex-col items-end gap-1 w-full sm:w-auto text-end">
                    <div className="text-sm text-muted-foreground">
                      <span>{(dictionary as any).createInvoiceForm?.subtotal || 'Subtotal'}: </span>
                      <span className="font-medium">{subTotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        <span>{(dictionary as any).createInvoiceForm?.discount || 'Discount'}: </span>
                        <span className="font-medium">-{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="text-xl font-bold text-primary border-t border-primary/20 pt-1 mt-1 w-full sm:w-auto">
                      <span>{d.total}: </span>
                      <span>{totalAmount.toFixed(2)} {dictionary.dashboard?.currency || 'DZD'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={!customerInput.trim() || saleItems.length === 0 || isLoading}
              className="flex-1"
            >
              {d.submit}
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={!customerInput.trim() || saleItems.length === 0 || isLoading}
              className="flex-1"
            >
              {isLoading ? <span className="animate-spin me-2">⏳</span> : null}
              {d.saveAndGenerate || 'Save & Generate Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TrialButtonLock>
  );
});

LogSaleDialog.displayName = 'LogSaleDialog';
