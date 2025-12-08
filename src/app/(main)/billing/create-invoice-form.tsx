
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateInvoicePdf } from './invoice-generator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  lineItems: z.array(lineItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.string().optional().default('Espèce'),
  applyVatToAll: z.boolean().default(false),
});

export type InvoiceFormData = z.infer<typeof formSchema>;

interface CreateInvoiceFormProps {
    onSuccess: () => void;
}

const getNextInvoiceNumber = () => {
    try {
        const lastNumberStr = localStorage.getItem('lastInvoiceNumber');
        const currentYear = new Date().getFullYear();
        let nextNumber = 1;

        if (lastNumberStr) {
            const lastNumberData = JSON.parse(lastNumberStr);
            if (lastNumberData.year === currentYear) {
                nextNumber = lastNumberData.number + 1;
            }
        }
        
        const paddedNumber = nextNumber.toString().padStart(4, '0');
        return `FAC-${currentYear}-${paddedNumber}`;
    } catch {
        // Fallback in case of localStorage error
        return `FAC-${new Date().getFullYear()}-0001`;
    }
}

const updateLastInvoiceNumber = () => {
    try {
        const lastNumberStr = localStorage.getItem('lastInvoiceNumber');
        const currentYear = new Date().getFullYear();
        let newNumber = 1;

        if (lastNumberStr) {
            const lastNumberData = JSON.parse(lastNumberStr);
            if (lastNumberData.year === currentYear) {
                newNumber = lastNumberData.number + 1;
            }
        }
        localStorage.setItem('lastInvoiceNumber', JSON.stringify({ year: currentYear, number: newNumber }));
    } catch {
        // Silently fail if localStorage is not available
    }
}


export const CreateInvoiceForm = React.forwardRef<HTMLFormElement, CreateInvoiceFormProps>(({ onSuccess }, ref) => {
  const { toast } = useToast();
  
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isProforma: false,
      invoiceNumber: getNextInvoiceNumber(),
      invoiceDate: new Date().toISOString().split('T')[0],
      clientName: '',
      clientAddress: '',
      clientNis: '',
      clientNif: '',
      clientRc: '',
      lineItems: [{ designation: '', quantity: 1, unitPrice: 0, vat: 0, reference: '', unit: 'pcs' }],
      paymentMethod: 'Espèce',
      applyVatToAll: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const { watch, setValue, reset } = form;

  const applyVatToAll = watch('applyVatToAll');
  
  React.useEffect(() => {
    const newVatRate = applyVatToAll ? 19 : 0;
    fields.forEach((field, index) => {
        const currentVat = form.getValues(`lineItems.${index}.vat`);
        if(currentVat !== newVatRate) {
            setValue(`lineItems.${index}.vat`, newVatRate, { shouldValidate: true, shouldDirty: true });
        }
    });
  }, [applyVatToAll, fields, setValue, form]);


  function onSubmit(values: InvoiceFormData) {
    try {
        generateInvoicePdf(values);
        if (!values.isProforma) {
            updateLastInvoiceNumber();
        }
        toast({
            title: 'Invoice Generated',
            description: 'Your invoice PDF has been downloaded.',
        });
        onSuccess();
        // Reset form with the next invoice number
        reset({
            ...form.getValues(),
            isProforma: false,
            invoiceNumber: getNextInvoiceNumber(),
            invoiceDate: new Date().toISOString().split('T')[0],
            clientName: '',
            clientAddress: '',
            clientNis: '',
            clientNif: '',
            clientRc: '',
            lineItems: [{ designation: '', quantity: 1, unitPrice: 0, vat: 0, reference: '', unit: 'pcs' }],
            paymentMethod: 'Espèce',
            applyVatToAll: false,
        });
    } catch (error) {
        console.error("Failed to generate PDF", error);
        toast({
            title: 'Generation Failed',
            description: 'There was an error creating the PDF.',
            variant: 'destructive',
        });
    }
  }

  return (
    <Form {...form}>
      <form ref={ref} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invoice Details</CardTitle>
              <FormField
                control={form.control}
                name="isProforma"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Proforma Invoice
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice N°</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <FormControl><Input placeholder="Client Name" {...field} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl><Input placeholder="Oran" {...field} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientNis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIS</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="clientRc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>R.C</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="clientNif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIF</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invoice Items</CardTitle>
              <FormField
                control={form.control}
                name="applyVatToAll"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Apply 19% VAT to all items
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 p-4 border rounded-md relative">
                    <p className="col-span-12 text-sm font-medium">Item {index + 1}</p>
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.reference`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-2">
                        <FormLabel>Référence</FormLabel>
                        <FormControl><Input placeholder="P00003" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.designation`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-6">
                        <FormLabel>Désignation</FormLabel>
                        <FormControl><Input placeholder="Crispy Crepe Choco Boite 20P" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.unit`}
                    render={({ field }) => (
                      <FormItem className="col-span-6 md:col-span-1">
                        <FormLabel>U</FormLabel>
                        <FormControl><Input placeholder="Carton" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="col-span-6 md:col-span-1">
                        <FormLabel>Qté</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name={`lineItems.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-2">
                        <FormLabel>PUV</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => append({ designation: '', quantity: 1, unitPrice: 0, vat: applyVatToAll ? 19 : 0, reference: '', unit: 'pcs' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
                <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mode paiement</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a payment method" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Espèce">Espèce</SelectItem>
                                    <SelectItem value="Chèque">Chèque</SelectItem>
                                    <SelectItem value="Virement">Virement</SelectItem>
                                </SelectContent>
                            </Select>
                          <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
        
        {/* The submit button is now in the dialog footer */}
        <button type="submit" className="hidden"></button>
      </form>
    </Form>
  );
});

CreateInvoiceForm.displayName = "CreateInvoiceForm";
