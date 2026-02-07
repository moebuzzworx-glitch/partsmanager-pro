'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, ListPlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { User as AppUser, DocumentType } from '@/lib/types';
import { canExport, getExportRestrictionMessage } from '@/lib/trial-utils';
import { getUserSettings, getNextDocumentNumber, updateLastDocumentNumber, AppSettings } from '@/lib/settings-utils';
import { saveInvoiceData, calculateInvoiceTotals, deductStockFromInvoice, updateInvoice, recordSalesFromInvoice } from '@/lib/invoices-utils';
import { useToast } from '@/hooks/use-toast';
import type { Locale } from '@/lib/config';
import { getDictionary } from '@/lib/dictionaries';
import { generateDocumentPdf } from './document-generator';
import { getCustomersForAutoComplete, getProductsForAutoComplete, type ClientAutoComplete, type ProductAutoComplete } from '@/lib/invoice-autocomplete-utils';
import { PaymentDialog } from './payment-dialog';
import { BatchAddProductsDialog } from './batch-add-products-dialog';
import { useScanSession } from '@/lib/scan-session-provider';
import { PairingCode } from '@/components/dashboard/scan/pairing-code';
import { QrCode, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const lineItemSchema = z.object({
  reference: z.string().optional(),
  designation: z.string().min(1, 'Designation is required'),
  unit: z.string().optional(),
  quantity: z.coerce.number().positive('Must be > 0'),
  unitPrice: z.coerce.number().positive('Must be > 0'),
});

const formSchema = z.object({
  isProforma: z.boolean().default(false),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string().optional(),
  clientNis: z.string().optional(),
  clientNif: z.string().optional(),
  clientRc: z.string().optional(),
  clientArt: z.string().optional(),
  clientRib: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.string().optional().default('Espèce'),
  applyVatToAll: z.boolean().default(false),
  applyTimbre: z.boolean().default(false),
  discountType: z.enum(['percentage', 'amount']).default('percentage'),
  discountValue: z.coerce.number().min(0).default(0),
  includeJuridicTerms: z.boolean().default(false),
  juridicTerms: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof formSchema>;
// ...

export interface CreateInvoiceFormRef {
  submit: () => void;
  handleScan: (productId: string) => void;
}

export const CreateInvoiceForm = React.forwardRef<CreateInvoiceFormRef, {
  documentType: DocumentType;
  onLoadingChange?: (isLoading: boolean) => void;
  onSuccess: () => void;
  dictionary: any;
  hideTypeSelector?: boolean;
  initialData?: {
    clientName?: string;
    clientAddress?: string;
    clientNis?: string;
    clientNif?: string;
    clientRc?: string;
    clientArt?: string;
    clientRib?: string;
    lineItems?: { reference?: string; designation: string; quantity: number; unitPrice: number; unit?: string }[];
    paymentMethod?: string;
    applyVatToAll?: boolean;
    applyTimbre?: boolean;
  };
}>(({ documentType: initialDocumentType, onLoadingChange, onSuccess, dictionary, hideTypeSelector, initialData }, ref) => {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  // ... state ...
  const [settingsState, setSettingsState] = React.useState<AppSettings | null>(null);
  const [userDoc, setUserDoc] = React.useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [nextDocNumber, setNextDocNumber] = React.useState('');
  const [customers, setCustomers] = React.useState<ClientAutoComplete[]>([]);
  const [products, setProducts] = React.useState<ProductAutoComplete[]>([]);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);
  const [clientSearchOpen, setClientSearchOpen] = React.useState(false);
  const [productSearchOpen, setProductSearchOpen] = React.useState<Record<number, boolean>>({});
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [createdInvoiceData, setCreatedInvoiceData] = React.useState<{ amount: number, clientName: string, number: string } | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false);

  // Initialize documentType from prop, but allow it to change
  const [documentType, setDocumentType] = React.useState(initialDocumentType);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isProforma: false,
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      clientName: '',
      clientAddress: '',
      clientNis: '',
      clientNif: '',
      clientRc: '',
      clientArt: '',
      clientRib: '',
      lineItems: [{ designation: '', quantity: 1, unitPrice: 0, reference: '', unit: 'pcs' }],
      paymentMethod: 'Espèce',
      applyVatToAll: documentType === 'PURCHASE_ORDER',
      applyTimbre: false,
      discountType: 'percentage',
      discountValue: 0,
      includeJuridicTerms: false,
      juridicTerms: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  // Handle scans
  React.useImperativeHandle(ref, () => ({
    submit: () => {
      form.handleSubmit(onSubmit)();
    },
    handleScan: (productId: string) => {
      const product = products.find(p => p.id === productId);
      if (product) {
        // Check if product already exists in lineItems to increment quantity
        const currentItems = form.getValues('lineItems');
        const existingIndex = currentItems.findIndex(item => item.reference === product.reference || item.designation === product.name);

        if (existingIndex >= 0) {
          // Increment
          const currentQty = currentItems[existingIndex].quantity;
          form.setValue(`lineItems.${existingIndex}.quantity`, currentQty + 1);
          toast({ title: "Quantity Updated", description: `${product.name} +1` });
        } else {
          // Add new
          const price = documentType === 'PURCHASE_ORDER' ? (product.purchasePrice || 0) : (product.price || 0);
          append({
            reference: product.reference || '',
            designation: product.name,
            quantity: 1,
            unitPrice: price,
            unit: 'pcs'
          });
          toast({ title: "Product Added", description: `${product.name}` });
        }
      } else {
        toast({ title: "Product Not Found", description: "Not found in stock.", variant: "destructive" });
      }
    }
  }));

  const { watch, setValue } = form;
  const applyVatToAll = watch('applyVatToAll');

  // Pre-fill form with initialData if provided (for reuse/duplicate feature)
  React.useEffect(() => {
    if (initialData) {
      if (initialData.clientName) setValue('clientName', initialData.clientName);
      if (initialData.clientAddress) setValue('clientAddress', initialData.clientAddress);
      if (initialData.clientNis) setValue('clientNis', initialData.clientNis);
      if (initialData.clientNif) setValue('clientNif', initialData.clientNif);
      if (initialData.clientRc) setValue('clientRc', initialData.clientRc);
      if (initialData.clientArt) setValue('clientArt', initialData.clientArt);
      if (initialData.clientRib) setValue('clientRib', initialData.clientRib);
      if (initialData.paymentMethod) setValue('paymentMethod', initialData.paymentMethod);
      if (initialData.applyVatToAll !== undefined) setValue('applyVatToAll', initialData.applyVatToAll);
      if (initialData.applyTimbre !== undefined) setValue('applyTimbre', initialData.applyTimbre);
      if (initialData.lineItems && initialData.lineItems.length > 0) {
        setValue('lineItems', initialData.lineItems.map(item => ({
          reference: item.reference || '',
          designation: item.designation,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit || 'pcs',
        })));
      }
    }
  }, [initialData, setValue]);

  // React to document type changes to update numbering
  React.useEffect(() => {
    if (settingsState) {
      const next = getNextDocumentNumber(settingsState, documentType);
      setNextDocNumber(next);
      setTimeout(() => setValue('invoiceNumber', next), 0);

      // Auto-enable juridic terms for Term Invoices
      if (documentType === 'TERM_INVOICE') {
        setValue('includeJuridicTerms', true);
      } else {
        setValue('includeJuridicTerms', false);
      }
    }
  }, [documentType, settingsState, setValue]);

  // Initial Fetch user document and settings
  React.useEffect(() => {
    if (!user || !firestore) return;
    const fetchData = async () => {
      try {
        const userDocSnap = await getDoc(doc(firestore, 'users', user.uid));
        if (userDocSnap.exists()) setUserDoc(userDocSnap.data() as AppUser);
        const settings = await getUserSettings(firestore, user.uid);
        setSettingsState(settings);
        const next = getNextDocumentNumber(settings, documentType);
        setNextDocNumber(next);
        setValue('invoiceNumber', next);

        // Set Juridic Terms Default
        setValue('juridicTerms', settings.juridicTerms || '');

        const [cust, prod, invs] = await Promise.all([
          getCustomersForAutoComplete(firestore, user.uid),
          getProductsForAutoComplete(firestore, user.uid),
          documentType === 'DELIVERY_NOTE' ? (async () => {
            const invoicesRef = collection(firestore, 'invoices');
            const q = query(invoicesRef, where('userId', '==', user.uid), where('documentType', '==', 'INVOICE'));
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          })() : Promise.resolve([])
        ]);
        setCustomers(cust);
        setProducts(prod);
        setInvoices(invs);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [user, firestore, documentType, setValue]);

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    setSelectedInvoiceId(invoiceId);
    setValue('clientName', inv.clientName || '');
    setValue('clientAddress', inv.clientAddress || '');
    setValue('clientNis', inv.clientNis || '');
    setValue('clientNif', inv.clientNif || '');
    setValue('clientRc', inv.clientRc || '');
    setValue('clientArt', inv.clientArt || '');
    setValue('clientRib', inv.clientRib || '');
    setValue(`lineItems`, (inv.lineItems || []).map((item: any) => ({
      reference: item.reference || '',
      designation: item.designation || '',
      unit: item.unit || 'pcs',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0
    })));
    setValue('applyVatToAll', !!inv.applyVatToAll);
    setValue('discountType', inv.discountType || 'percentage');
    setValue('discountValue', inv.discountValue || 0);
    toast({ title: 'Success', description: 'Invoice data loaded.' });
  };

  const handleClientSelect = (client: ClientAutoComplete) => {
    setValue('clientName', client.name);
    setValue('clientAddress', client.address || '');
    setValue('clientNis', client.nis || '');
    setValue('clientNif', client.nif || '');
    setValue('clientRc', client.rc || '');
    setValue('clientArt', client.art || '');
    setValue('clientRib', client.rib || '');
    setClientSearchOpen(false);
  };

  const handleProductSelect = (product: ProductAutoComplete, index: number) => {
    setValue(`lineItems.${index}.reference`, product.reference || '');
    setValue(`lineItems.${index}.designation`, product.name);

    const rawPrice = documentType === 'PURCHASE_ORDER'
      ? (product.purchasePrice || 0)
      : (product.price || 0);

    // Round to 2 decimal places
    const priceToUse = Math.round(rawPrice * 100) / 100;

    setValue(`lineItems.${index}.unitPrice`, priceToUse);
    setProductSearchOpen(prev => ({ ...prev, [index]: false }));
  };

  const handleBatchAddProducts = (items: { reference: string; designation: string; quantity: number; unitPrice: number; unit: string }[]) => {
    items.forEach(item => {
      append(item);
    });
  };

  const onSubmit = async (values: InvoiceFormData) => {
    if (!firestore || !user) return;
    setIsLoading(true);
    onLoadingChange?.(true);
    try {
      const settings = await getUserSettings(firestore, user.uid);
      const companyInfo = {
        companyName: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        rc: settings.rc, nif: settings.nif, art: settings.art, nis: settings.nis, rib: settings.rib,
        logoUrl: (settings as any).logoUrl,
        // Use the term from the form (user might have edited it), fallback to settings if empty
        juridicTerms: values.juridicTerms ?? settings.juridicTerms
      };
      const defaultVat = (settings as any).defaultVat ?? 0;
      const defaultTimbre = (settings as any).defaultTimbre ?? 1;

      const { subtotal, vatAmount, discountAmount, total } = calculateInvoiceTotals(
        values.lineItems,
        values.applyVatToAll,
        defaultVat || 19,
        values.discountType,
        values.discountValue
      );

      await generateDocumentPdf(
        values,
        documentType,
        companyInfo as any,
        defaultVat,
        values.applyVatToAll,
        defaultTimbre,
        values.applyTimbre,
        dictionary
      );

      const isPaid = documentType === 'SALES_RECEIPT';

      const invoiceId = await saveInvoiceData(
        firestore,
        user.uid,
        values,
        companyInfo as any,
        defaultVat,
        total,
        subtotal,
        vatAmount,
        documentType,
        isPaid
      );

      // Update the document to include discount info (persisting what we calculated)
      await updateInvoice(firestore, invoiceId, {
        discountType: values.discountType,
        discountValue: values.discountValue,
        discountAmount,
        subtotal,
        vatAmount,
        total
      });

      if (!values.isProforma) {
        const currentInvoiceData = {
          ...values,
          id: invoiceId,
          userId: user.uid,
          documentType,
          total,
          subtotal,
          vatAmount,
          companyInfo,
          defaultVat,
          clientName: values.clientName,
          invoiceDate: values.invoiceDate,
          discountAmount: discountAmount,
          paid: isPaid
        };

        await deductStockFromInvoice(firestore, currentInvoiceData as any);

        if (isPaid) {
          await recordSalesFromInvoice(firestore, user.uid, currentInvoiceData as any);
        }
      }
      await updateLastDocumentNumber(firestore, user.uid, settings, documentType);


      // CHECK FOR PAYMENT METHOD: CHARGILY
      if (values.paymentMethod === 'Carte') {
        setCreatedInvoiceData({
          amount: total,
          clientName: values.clientName,
          number: values.invoiceNumber
        });
        setPaymentModalOpen(true);
        toast({ title: 'Invoice Saved', description: 'Proceeding to payment...' });
        // We do NOT call onSuccess() here, we wait for payment dialog to close
      } else {
        toast({ title: 'Success', description: `${documentType} generated.` });
        onSuccess();
      }

    } catch (e) {
      console.error(e);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  // QR Code Section Component for Mobile Scanner Pairing
  const ScannerQRSection = () => {
    const { sessionId } = useScanSession();
    const [isQrOpen, setIsQrOpen] = React.useState(false);

    if (!sessionId) return null;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
      <Collapsible open={isQrOpen} onOpenChange={setIsQrOpen} className="mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full flex justify-between items-center">
            <span className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              {dictionary?.createInvoiceForm?.scannerPairing || 'Mobile Scanner'}
            </span>
            {isQrOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card className="bg-muted/50">
            <CardContent className="p-4 flex justify-center">
              <PairingCode sessionId={sessionId} baseUrl={baseUrl} />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Form {...form}>
          {/* Collapsible QR Code Section for Mobile Scanner */}
          <ScannerQRSection />
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{dictionary?.createInvoiceForm?.invoiceDetails || 'Document Details'}</h3>
              <div className="flex items-center gap-4">
                {documentType === 'DELIVERY_NOTE' && invoices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{dictionary?.createInvoiceForm?.linkToInvoice || 'Link to Invoice:'}</Label>
                    <Select value={selectedInvoiceId} onValueChange={handleInvoiceSelect}>
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue placeholder={dictionary?.createInvoiceForm?.choose || "Choose..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {invoices.map(inv => (
                          <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!hideTypeSelector && (
                  <div className="flex items-center gap-2">
                    <Label>{dictionary?.createInvoiceForm?.type || 'Type:'}</Label>
                    <Select value={documentType} onValueChange={(v: any) => setDocumentType(v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INVOICE">{dictionary?.invoices?.docInvoice || 'Invoice'}</SelectItem>
                        <SelectItem value="TERM_INVOICE">{dictionary?.createInvoiceForm?.termInvoice || 'Term Invoice'}</SelectItem>
                        <SelectItem value="PURCHASE_ORDER">{dictionary?.invoices?.docPurchaseOrder || 'Purchase Order'}</SelectItem>
                        <SelectItem value="DELIVERY_NOTE">{dictionary?.invoices?.docDeliveryNote || 'Delivery Note'}</SelectItem>
                        <SelectItem value="SALES_RECEIPT">{dictionary?.invoices?.docSalesReceipt || 'Sales Receipt'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.createInvoiceForm?.documentNumber || 'Document Number'}</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.createInvoiceForm?.documentDate || 'Document Date'}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <h3 className="font-semibold text-lg border-b pb-1">
              {documentType === 'PURCHASE_ORDER' ? (dictionary?.createInvoiceForm?.supplierInformation || 'Supplier Information') : (dictionary?.createInvoiceForm?.clientInformation || 'Client Information')}
            </h3>
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => {
                const clientSearchValue = field.value || '';
                const filteredClients = customers.filter(c =>
                  c.name.toLowerCase().includes(clientSearchValue.toLowerCase())
                );
                return (
                  <FormItem className="relative">
                    <FormLabel>
                      {documentType === 'PURCHASE_ORDER' ? (dictionary?.createInvoiceForm?.supplierName || 'Supplier Name') : (dictionary?.createInvoiceForm?.clientName || 'Client Name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={documentType === 'PURCHASE_ORDER' ? (dictionary?.createInvoiceForm?.supplierNamePlaceholder || 'Supplier or company name') : (dictionary?.createInvoiceForm?.clientNamePlaceholder || 'Client or company name')}
                        onFocus={() => setClientSearchOpen(true)}
                        onBlur={() => setTimeout(() => setClientSearchOpen(false), 200)}
                        autoComplete="off"
                      />
                    </FormControl>
                    {clientSearchOpen && filteredClients.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-background border border-primary rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                        {filteredClients.map((client) => (
                          <div
                            key={client.id}
                            className="px-4 py-2 hover:bg-primary hover:text-primary-foreground cursor-pointer text-sm transition-colors"
                            onMouseDown={() => handleClientSelect(client)}
                          >
                            <div className="font-medium">{client.name}</div>
                            {client.address && <div className="text-xs opacity-70">{client.address}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="clientAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.createInvoiceForm?.address || 'Address (Optional)'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.createInvoiceForm?.addressPlaceholder || 'Client address'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="clientNis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.createInvoiceForm?.nis || 'NIS (Optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.createInvoiceForm?.nisPlaceholder || 'NIS'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientNif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.createInvoiceForm?.nif || 'NIF (Optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.createInvoiceForm?.nifPlaceholder || 'NIF'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="clientRc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.createInvoiceForm?.rc || 'RC (Optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.createInvoiceForm?.rcPlaceholder || 'RC'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientArt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.createInvoiceForm?.art || 'ART (Optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.createInvoiceForm?.artPlaceholder || 'ART'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clientRib"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.createInvoiceForm?.rib || 'RIB (Optional)'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.createInvoiceForm?.ribPlaceholder || 'RIB'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{dictionary?.createInvoiceForm?.lineItems || 'Line Items'}</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ designation: '', quantity: 1, unitPrice: 0, reference: '', unit: 'pcs' })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {dictionary?.createInvoiceForm?.addItem || 'Add Item'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBatchDialogOpen(true)}
                >
                  <ListPlus className="mr-2 h-4 w-4" />
                  {dictionary?.createInvoiceForm?.batchAddProducts || 'Add Products'}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 p-4 border rounded-md relative">
                  <p className="col-span-12 text-sm font-medium">{dictionary?.createInvoiceForm?.itemNumber?.replace('{number}', String(index + 1)) || `Item ${index + 1}`}</p>

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.reference`}
                    render={({ field }) => {
                      const referenceValue = field.value;
                      const filteredProductsByRef = products.filter(p =>
                        p.reference && referenceValue && p.reference.toLowerCase().includes(referenceValue.toLowerCase())
                      );
                      return (
                        <FormItem className="col-span-3 relative">
                          <FormLabel>{dictionary?.createInvoiceForm?.reference || 'Reference'}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={dictionary?.createInvoiceForm?.referencePlaceholder || 'Reference'}
                              onFocus={() => setProductSearchOpen(prev => ({ ...prev, [index]: true }))}
                              onBlur={() => setTimeout(() => setProductSearchOpen(prev => ({ ...prev, [index]: false })), 200)}
                              autoComplete="off"
                            />
                          </FormControl>
                          {productSearchOpen[index] && filteredProductsByRef.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 bg-background border border-primary rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                              {filteredProductsByRef.map((product) => (
                                <div
                                  key={product.id}
                                  className="px-4 py-2 hover:bg-primary hover:text-primary-foreground cursor-pointer text-sm transition-colors"
                                  onMouseDown={() => handleProductSelect(product, index)}
                                >
                                  <div className="font-medium">{product.reference}</div>
                                  <div className="text-xs opacity-70">{product.name} {product.stock !== undefined && `• Stock: ${product.stock}`}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.designation`}
                    render={({ field }) => {
                      const designationValue = field.value;
                      const filteredProducts = products.filter(p =>
                        p.name.toLowerCase().includes(designationValue.toLowerCase()) ||
                        (p.reference && p.reference.toLowerCase().includes(designationValue.toLowerCase()))
                      );
                      return (
                        <FormItem className="col-span-4 relative">
                          <FormLabel>{dictionary?.createInvoiceForm?.designation || 'Designation'}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={dictionary?.createInvoiceForm?.designationPlaceholder || 'Product description'}
                              onFocus={() => setProductSearchOpen(prev => ({ ...prev, [index]: true }))}
                              onBlur={() => setTimeout(() => setProductSearchOpen(prev => ({ ...prev, [index]: false })), 200)}
                              autoComplete="off"
                            />
                          </FormControl>
                          {productSearchOpen[index] && filteredProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 bg-background border border-primary rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                              {filteredProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className="px-4 py-2 hover:bg-primary hover:text-primary-foreground cursor-pointer text-sm transition-colors"
                                  onMouseDown={() => handleProductSelect(product, index)}
                                >
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-xs opacity-70">
                                    {product.reference && `Ref: ${product.reference}`}
                                    {product.stock !== undefined && ` • Stock: ${product.stock}`}
                                    {product.price && ` • Price: ${product.price} ${dictionary?.dashboard?.currency || 'DZD'}`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.unit`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>{dictionary?.createInvoiceForm?.unit || 'Unit'}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={dictionary?.createInvoiceForm?.unitPlaceholder || 'pcs'} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          {documentType === 'DELIVERY_NOTE' ? (dictionary?.createInvoiceForm?.quantityDelivered || 'Qty Delivered') : (dictionary?.createInvoiceForm?.quantity || 'Qty')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>
                          {documentType === 'PURCHASE_ORDER' ? (dictionary?.createInvoiceForm?.purchasePrice || 'Purchase Price') :
                            documentType === 'DELIVERY_NOTE' ? (dictionary?.createInvoiceForm?.priceOptional || 'Price (Optional)') :
                              (dictionary?.createInvoiceForm?.price || 'Sale Price')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* per-line VAT removed — VAT is controlled globally via applyVatToAll */}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-1 h-10 mt-8"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <BatchAddProductsDialog
              open={batchDialogOpen}
              onOpenChange={setBatchDialogOpen}
              products={products}
              documentType={documentType}
              dictionary={dictionary}
              onAddProducts={handleBatchAddProducts}
            />

            <Separator />

            <h3 className="font-semibold">{dictionary?.createInvoiceForm?.payment || 'Payment'}</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.createInvoiceForm?.paymentMethod || 'Payment Method'}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Espèce">{dictionary?.createInvoiceForm?.cash || 'Cash'}</SelectItem>
                        <SelectItem value="Chèque">{dictionary?.createInvoiceForm?.check || 'Check'}</SelectItem>
                        <SelectItem value="Virement">{dictionary?.createInvoiceForm?.transfer || 'Transfer'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-4 p-4 border border-dashed border-primary/30 rounded-md bg-primary/5">
                {(documentType === 'INVOICE' || documentType === 'TERM_INVOICE') && (
                  <FormField
                    control={form.control}
                    name="isProforma"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="proforma-payment"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="proforma-payment" className="text-sm font-normal cursor-pointer">
                          {dictionary?.createInvoiceForm?.isProforma || 'This is a Proforma Invoice'}
                        </Label>
                      </div>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="applyVatToAll"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="applyVat-payment"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="applyVat-payment" className="text-sm font-normal cursor-pointer">
                        {dictionary?.createInvoiceForm?.applyVat || 'Apply VAT to all items'}
                      </Label>
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applyTimbre"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="applyTimbre-payment"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="applyTimbre-payment" className="text-sm font-normal cursor-pointer">
                        {dictionary?.createInvoiceForm?.applyTimbre || 'Apply Timbre (Stamp Duty)'}
                      </Label>
                    </div>
                  )}
                />
              </div>

              {/* Discount Section */}
              <div className="flex flex-col gap-4 p-4 border border-dashed border-primary/30 rounded-md bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dictionary?.createInvoiceForm?.discountType || 'Discount Type'}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percent (%)</SelectItem>
                              <SelectItem value="amount">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dictionary?.createInvoiceForm?.discountValue || 'Discount Value'}</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" placeholder="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Juridic Terms Toggle and Textarea */}
              <div className="flex flex-col gap-4 p-4 border border-dashed border-primary/30 rounded-md bg-primary/5 mt-4">
                <FormField
                  control={form.control}
                  name="includeJuridicTerms"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{dictionary?.createInvoiceForm?.applyJuridicTerms || "Apply Invoice Rules?"}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(v) => field.onChange(v === 'true')}
                          defaultValue={field.value ? 'true' : 'false'}
                          className="flex flex-row space-x-4 space-y-0"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="true" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {dictionary?.common?.yes || "Yes"}
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="false" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {dictionary?.common?.no || "No"}
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch('includeJuridicTerms')) && (
                  <FormField
                    control={form.control}
                    name="juridicTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dictionary?.createInvoiceForm?.juridicTerms || 'Terms & Conditions (Official)'}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={dictionary?.createInvoiceForm?.juridicTermsPlaceholder || "Legal terms for this invoice..."}
                            className="min-h-[120px] font-mono text-sm"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {dictionary?.createInvoiceForm?.juridicTermsHelp || "These terms will be printed on the invoice. You can edit them for this specific document."}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        </Form>
      </form>

      {createdInvoiceData && (
        <PaymentDialog
          open={paymentModalOpen}
          onOpenChange={(open) => {
            setPaymentModalOpen(open);
            if (!open) onSuccess(); // If they close the payment dialog, we proceed to close the invoice dialog
          }}
          amount={createdInvoiceData.amount}
          clientName={createdInvoiceData.clientName}
          invoiceNumber={createdInvoiceData.number}
        />
      )}
    </>
  );
}
);

CreateInvoiceForm.displayName = 'CreateInvoiceForm';
