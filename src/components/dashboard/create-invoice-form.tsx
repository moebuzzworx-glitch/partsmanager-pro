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
import { getUserSettings, getNextInvoiceNumber, updateLastInvoiceNumber } from '@/lib/settings-utils';
import { useToast } from '@/hooks/use-toast';
import type { Locale } from '@/lib/config';
import { generateInvoicePdf } from './invoice-generator';

const lineItemSchema = z.object({
  reference: z.string().optional(),
  designation: z.string().min(1, 'Designation is required'),
  unit: z.string().optional(),
  quantity: z.coerce.number().positive('Must be > 0'),
  unitPrice: z.coerce.number().positive('Must be > 0'),
  vat: z.coerce.number().min(0, 'Cannot be negative').default(0),
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
          const nextNumber = getNextInvoiceNumber(settings);
          setNextInvoiceNumber(nextNumber);
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
        lineItems: [{ designation: '', quantity: 1, unitPrice: 0, vat: 0, reference: '', unit: 'pcs' }],
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
        // Apply VAT to all items if checkbox is selected
        if (applyVatToAll) {
          const defaultVat = values.lineItems[0]?.vat || 0;
          values.lineItems.forEach((item) => {
            item.vat = defaultVat;
          });
        }

        // Get company info from Firestore settings
        const settings = await getUserSettings(firestore, user.uid);
        
        // Generate PDF with form data
        await generateInvoicePdf(values);

        // Update last invoice number in Firestore settings
        await updateLastInvoiceNumber(firestore, user.uid, settings);

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
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="isProforma"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="proforma"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="proforma" className="text-sm font-normal">
                        Proforma
                      </Label>
                    </div>
                  )}
                />
              </div>
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Client name or company" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="applyVatToAll"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="applyVat"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="applyVat" className="text-sm font-normal">
                        Apply VAT to all
                      </Label>
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 p-4 border rounded-md relative">
                  <p className="col-span-12 text-sm font-medium">Item {index + 1}</p>

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.reference`}
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Reference</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Reference" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.designation`}
                    render={({ field }) => (
                      <FormItem className="col-span-4">
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Product description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
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

                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.vat`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>VAT %</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                append({ designation: '', quantity: 1, unitPrice: 0, vat: 0, reference: '', unit: 'pcs' })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>

            <Separator />

            <h3 className="font-semibold">Payment</h3>
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
          </div>
        </Form>
      </form>
    );
  }
);

CreateInvoiceForm.displayName = 'CreateInvoiceForm';
