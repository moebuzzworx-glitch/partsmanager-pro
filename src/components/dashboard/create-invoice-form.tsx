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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';
import { canExport, getExportRestrictionMessage } from '@/lib/trial-utils';
import { getUserSettings, getNextDocumentNumber, updateLastDocumentNumber, AppSettings } from '@/lib/settings-utils';
import { saveInvoiceData, calculateInvoiceTotals, deductStockFromInvoice } from '@/lib/invoices-utils';
import { useToast } from '@/hooks/use-toast';
import type { Locale } from '@/lib/config';
import { getDictionary } from '@/lib/dictionaries';
import { generateDocumentPdf } from './document-generator';
import { getCustomersForAutoComplete, getProductsForAutoComplete, type ClientAutoComplete, type ProductAutoComplete } from '@/lib/invoice-autocomplete-utils';

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
});

export type InvoiceFormData = z.infer<typeof formSchema>;

interface CreateInvoiceFormProps {
  locale: Locale;
  onSuccess: () => void;
  defaultType?: 'INVOICE' | 'PURCHASE_ORDER' | 'DELIVERY_NOTE' | 'SALES_RECEIPT';
  hideTypeSelector?: boolean;
}

// Invoice number functions are imported from settings-utils
export const CreateInvoiceForm = React.forwardRef<HTMLFormElement, CreateInvoiceFormProps>(
  ({ locale, onSuccess, defaultType = 'INVOICE', hideTypeSelector = false }, ref) => {
    const { toast } = useToast();
    const { user, firestore } = useFirebase();
    const [userDoc, setUserDoc] = React.useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [documentType, setDocumentType] = React.useState<'INVOICE' | 'PURCHASE_ORDER' | 'DELIVERY_NOTE' | 'SALES_RECEIPT'>(defaultType || 'INVOICE');
    const [nextDocNumber, setNextDocNumber] = React.useState('');
    const [settingsState, setSettingsState] = React.useState<AppSettings | null>(null);
    const [customers, setCustomers] = React.useState<ClientAutoComplete[]>([]);
    const [products, setProducts] = React.useState<ProductAutoComplete[]>([]);
    const [clientSearchOpen, setClientSearchOpen] = React.useState(false);
    const [productSearchOpen, setProductSearchOpen] = React.useState<Record<number, boolean>>({});
    const [dictionary, setDictionary] = React.useState<any>(null);

    // Load dictionary
    React.useEffect(() => {
      const loadDictionary = async () => {
        const dict = await getDictionary(locale);
        setDictionary(dict);
      };
      loadDictionary();
    }, [locale]);



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
        applyVatToAll: false,
      },
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'lineItems',
    });

    const { watch, setValue } = form;
    const applyVatToAll = watch('applyVatToAll');

    // React to document type changes to update numbering
    React.useEffect(() => {
      if (settingsState) {
        const next = getNextDocumentNumber(settingsState, documentType);
        setNextDocNumber(next);
        setTimeout(() => setValue('invoiceNumber', next), 0);
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
          const [cust, prod] = await Promise.all([
            getCustomersForAutoComplete(firestore, user.uid),
            getProductsForAutoComplete(firestore, user.uid)
          ]);
          setCustomers(cust);
          setProducts(prod);
        } catch (e) {
          console.error(e);
        }
      };
      fetchData();
    }, [user, firestore, documentType, setValue]);

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
      setValue(`lineItems.${index}.unitPrice`, product.price || 0);
      setProductSearchOpen(prev => ({ ...prev, [index]: false }));
    };

    const onSubmit = async (values: InvoiceFormData) => {
      if (!firestore || !user) return;
      setIsLoading(true);
      try {
        const settings = await getUserSettings(firestore, user.uid);
        const companyInfo = {
          companyName: settings.companyName,
          address: settings.address,
          phone: settings.phone,
          rc: settings.rc, nif: settings.nif, art: settings.art, nis: settings.nis, rib: settings.rib,
          logoUrl: (settings as any).logoUrl
        };
        const defaultVat = (settings as any).defaultVat ?? 0;
        await generateDocumentPdf(values, documentType, companyInfo as any, defaultVat, values.applyVatToAll);
        const { subtotal, vatAmount, total } = calculateInvoiceTotals(values.lineItems, values.applyVatToAll, defaultVat || 19);
        const invoiceId = await saveInvoiceData(firestore, user.uid, values, companyInfo as any, defaultVat, total, subtotal, vatAmount, documentType);
        if (!values.isProforma) {
          await deductStockFromInvoice(firestore, { ...values, id: invoiceId, userId: user.uid, documentType, total, subtotal, vatAmount, companyInfo, defaultVat } as any);
        }
        await updateLastDocumentNumber(firestore, user.uid, settings, documentType);
        toast({ title: 'Success', description: `${documentType} generated.` });
        onSuccess();
      } catch (e) {
        console.error(e);
        toast({ title: 'Error', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <form ref={ref} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Form {...form}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{dictionary?.createInvoiceForm?.invoiceDetails || 'Document Details'}</h3>
              {!hideTypeSelector && (
                <div className="flex items-center gap-2">
                  <Label>Type:</Label>
                  <Select value={documentType} onValueChange={(v: any) => setDocumentType(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INVOICE">Facture</SelectItem>
                      <SelectItem value="PURCHASE_ORDER">Bon de Commande</SelectItem>
                      <SelectItem value="DELIVERY_NOTE">Bon de Livraison</SelectItem>
                      <SelectItem value="SALES_RECEIPT">Bon de Vente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro du Document</FormLabel>
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
                    <FormLabel>Date du Document</FormLabel>
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
              {documentType === 'PURCHASE_ORDER' ? 'Renseignements Fournisseur' : (dictionary?.createInvoiceForm?.clientInformation || 'Renseignements Client')}
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
                      {documentType === 'PURCHASE_ORDER' ? 'Nom du Fournisseur' : (dictionary?.createInvoiceForm?.clientName || 'Nom du Client')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={documentType === 'PURCHASE_ORDER' ? 'Nom du fournisseur ou entreprise' : (dictionary?.createInvoiceForm?.clientNamePlaceholder || 'Nom du client ou entreprise')}
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
                          {documentType === 'DELIVERY_NOTE' ? 'Qté Livrée' : (dictionary?.createInvoiceForm?.quantity || 'Qté')}
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
                          {documentType === 'PURCHASE_ORDER' ? 'Prix d\'achat' :
                            documentType === 'DELIVERY_NOTE' ? 'Prix (Facultatif)' :
                              (dictionary?.createInvoiceForm?.price || 'Prix de vente')}
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                append({ designation: '', quantity: 1, unitPrice: 0, reference: '', unit: 'pcs' })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {dictionary?.createInvoiceForm?.addLineItem || 'Add Line Item'}
            </Button>

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
                        <SelectItem value="Carte">{dictionary?.createInvoiceForm?.card || 'Card'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-4 p-4 border border-dashed border-primary/30 rounded-md bg-primary/5">
                {documentType === 'INVOICE' && (
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
              </div>
            </div>
          </div>
        </Form>
      </form>
    );
  }
);

CreateInvoiceForm.displayName = 'CreateInvoiceForm';
