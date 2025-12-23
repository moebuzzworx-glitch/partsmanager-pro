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
import { getUserSettings, getNextInvoiceNumber, updateLastInvoiceNumber, AppSettings } from '@/lib/settings-utils';
import { saveInvoiceData, calculateInvoiceTotals, deductStockFromInvoice } from '@/lib/invoices-utils';
import { useToast } from '@/hooks/use-toast';
import type { Locale } from '@/lib/config';
import { generateInvoicePdf } from './invoice-generator';
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
}

// Invoice number functions are imported from settings-utils
export const CreateInvoiceForm = React.forwardRef<HTMLFormElement, CreateInvoiceFormProps>(
  ({ locale, onSuccess }, ref) => {
    const { toast } = useToast();
    const { user, firestore } = useFirebase();
    const [userDoc, setUserDoc] = React.useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [nextInvoiceNumber, setNextInvoiceNumber] = React.useState('FAC-2025-0001');
    const [settingsState, setSettingsState] = React.useState<AppSettings | null>(null);
    const [customers, setCustomers] = React.useState<ClientAutoComplete[]>([]);
    const [products, setProducts] = React.useState<ProductAutoComplete[]>([]);
    const [clientSearchOpen, setClientSearchOpen] = React.useState(false);
    const [productSearchOpen, setProductSearchOpen] = React.useState<Record<number, boolean>>({});
    
    // Fetch user document and settings
    React.useEffect(() => {
      if (!user || !firestore) return;

      const fetchUserDocAndSettings = async () => {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserDoc(userDocSnap.data() as AppUser);
          }

          // Fetch settings and get next invoice number
          const settings = await getUserSettings(firestore, user.uid);
          setSettingsState(settings);
          const nextNumber = getNextInvoiceNumber(settings);
          setNextInvoiceNumber(nextNumber);
          // ensure form field reflects computed next invoice number
          setTimeout(() => setValue('invoiceNumber', nextNumber), 0);

          // Fetch customers and products for autocomplete
          const customersData = await getCustomersForAutoComplete(firestore, user.uid);
          const productsData = await getProductsForAutoComplete(firestore, user.uid);
          setCustomers(customersData);
          setProducts(productsData);
        } catch (error) {
          console.error('Error fetching user document and settings:', error);
        }
      };

      fetchUserDocAndSettings();
    }, [user, firestore]);
    
    const form = useForm<InvoiceFormData>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        isProforma: false,
        invoiceNumber: nextInvoiceNumber,
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

    // Handle client selection from autocomplete
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

    // Handle product selection from autocomplete
    const handleProductSelect = (product: ProductAutoComplete, index: number) => {
      setValue(`lineItems.${index}.reference`, product.reference || '');
      setValue(`lineItems.${index}.designation`, product.name);
      setValue(`lineItems.${index}.unitPrice`, product.price || 0);
      setProductSearchOpen(prev => ({ ...prev, [index]: false }));
    };

    const onSubmit = async (values: InvoiceFormData) => {
      // Check export permissions
      if (!canExport(userDoc)) {
        const message = getExportRestrictionMessage(userDoc) || 'You do not have permission to export invoices.';
        toast({
          title: 'Permission Denied',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      if (!firestore || !user) {
        toast({
          title: 'Error',
          description: 'Firestore not initialized.',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);
      try {
        // VAT is global (applyVatToAll) — handled in PDF generator via flag

        // Get company info from Firestore settings
        const settings = await getUserSettings(firestore, user.uid);
        
        // Generate PDF with form data; pass company info from settings if available
        const companyInfo = settingsState
          ? {
              companyName: settingsState.companyName,
              address: settingsState.address,
              phone: settingsState.phone,
              rc: settingsState.rc,
              nif: settingsState.nif,
              art: settingsState.art,
              nis: settingsState.nis,
              rib: settingsState.rib,
              logoUrl: (settingsState as any).logoUrl || undefined,
            }
          : undefined;

        // Determine default VAT percentage from settings (if present)
        const defaultVat = (settings as any)?.defaultVat ?? (settingsState as any)?.defaultVat ?? 0;

        // pass whether VAT should be applied to all lines
        await generateInvoicePdf(values, companyInfo, defaultVat, !!values.applyVatToAll);

        // Calculate totals
        const { subtotal, vatAmount, total } = calculateInvoiceTotals(
          values.lineItems,
          values.applyVatToAll,
          defaultVat || 19
        );

        // Save invoice data to Firestore (for future regeneration)
        const invoiceId = await saveInvoiceData(
          firestore,
          user.uid,
          values,
          companyInfo,
          defaultVat,
          total,
          subtotal,
          vatAmount
        );

        // Deduct stock from products for non-proforma invoices
        if (!values.isProforma) {
          const invoiceData = {
            id: invoiceId,
            userId: user.uid,
            invoiceNumber: values.invoiceNumber,
            invoiceDate: values.invoiceDate,
            isProforma: values.isProforma,
            clientName: values.clientName,
            clientAddress: values.clientAddress,
            clientNis: values.clientNis,
            clientNif: values.clientNif,
            clientRc: values.clientRc,
            clientArt: values.clientArt,
            clientRib: values.clientRib,
            lineItems: values.lineItems,
            paymentMethod: values.paymentMethod,
            applyVatToAll: values.applyVatToAll,
            companyInfo,
            defaultVat,
            total,
            subtotal,
            vatAmount,
            paid: false,
          };
          await deductStockFromInvoice(firestore, invoiceData);
        }

        // Update last invoice number in Firestore settings
        await updateLastInvoiceNumber(firestore, user.uid, settings);

        // refresh settings & next invoice number for the next invoice
        const refreshed = await getUserSettings(firestore, user.uid);
        setSettingsState(refreshed);
        const newNext = getNextInvoiceNumber(refreshed);
        setNextInvoiceNumber(newNext);
        setValue('invoiceNumber', newNext);

        toast({
          title: 'Success',
          description: 'Invoice generated and downloaded successfully.',
        });

        form.reset();
        onSuccess();
      } catch (error) {
        console.error('Error generating invoice:', error);
        toast({
          title: 'Error',
          description: 'Failed to generate invoice. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <form ref={ref} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Form {...form}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Invoice Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted" />
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
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <h3 className="font-semibold">Client Information</h3>
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => {
                const clientSearchValue = field.value;
                const filteredClients = customers.filter(c =>
                  c.name.toLowerCase().includes(clientSearchValue.toLowerCase())
                );
                return (
                  <FormItem className="relative">
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Client name or company" 
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
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Client address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientNis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIS (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="NIS" />
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
                    <FormLabel>NIF (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="NIF" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientRc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RC (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="RC" />
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
                    <FormLabel>ART (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ART" />
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
                  <FormLabel>RIB (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="RIB" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Line Items</h3>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 p-4 border rounded-md relative">
                  <p className="col-span-12 text-sm font-medium">Item {index + 1}</p>

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.reference`}
                    render={({ field }) => {
                      const referenceValue = field.value;
                      const filteredProductsByRef = products.filter(p =>
                        p.reference && p.reference.toLowerCase().includes(referenceValue.toLowerCase())
                      );
                      return (
                        <FormItem className="col-span-3 relative">
                          <FormLabel>Reference</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Reference" 
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
                          <FormLabel>Designation</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Product description" 
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
                                    {product.price && ` • Price: ${product.price} DZD`}
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
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="pcs" />
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
                        <FormLabel>Qty</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0" />
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
                        <FormLabel>Price</FormLabel>
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
              Add Line Item
            </Button>

            <Separator />

            <h3 className="font-semibold">Payment</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Espèce">Cash</SelectItem>
                        <SelectItem value="Chèque">Check</SelectItem>
                        <SelectItem value="Virement">Transfer</SelectItem>
                        <SelectItem value="Carte">Card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-4 p-4 border border-dashed border-primary/30 rounded-md bg-primary/5">
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
                        This is a Proforma Invoice
                      </Label>
                    </div>
                  )}
                />
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
                        Apply VAT to all items
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
