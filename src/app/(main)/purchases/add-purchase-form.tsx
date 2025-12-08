
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product, Supplier, Purchase } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CreateSupplierDialog } from '../suppliers/create-supplier-dialog';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Must be > 0'),
  price: z.coerce.number().positive('Must be > 0'),
});

const formSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  date: z.date({ required_error: 'A date is required.' }),
  items: z.array(lineItemSchema).min(1, 'At least one item is required'),
});

export type PurchaseFormData = z.infer<typeof formSchema>;

interface AddPurchaseFormProps {
    products: Product[];
    suppliers: Supplier[];
    onSuccess: () => void;
}

export const AddPurchaseForm = React.forwardRef<HTMLFormElement, AddPurchaseFormProps>(({ products, suppliers, onSuccess }, ref) => {
  const { toast } = useToast();
  const [isCreateSupplierOpen, setCreateSupplierOpen] = React.useState(false);
  const firestore = useFirestore();
  
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: '',
      date: new Date(),
      items: [{ productId: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const handleLocalSupplierCreated = (newSupplier: Supplier) => {
    form.setValue('supplierId', newSupplier.id);
  }

  const handleSupplierChange = (value: string) => {
    if (value === 'create-new') {
      setCreateSupplierOpen(true);
    } else {
      form.setValue('supplierId', value);
    }
  };

  async function onSubmit(values: PurchaseFormData) {
    if (!firestore) return;
    
    const total = values.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const newPurchaseData: Omit<Purchase, 'id' | 'items'> & {items: {productId: string; quantity: number; price: number}[], total: number, date: Date} = {
        supplierId: values.supplierId,
        date: values.date,
        items: values.items,
        total,
    };
    
    const purchasesCollection = collection(firestore, 'purchases');
    
    const purchaseRef = await addDocumentNonBlocking(purchasesCollection, newPurchaseData);
    
    const batch = writeBatch(firestore);
    values.items.forEach(item => {
        const productRef = doc(firestore, 'products', item.productId);
        // This should be an increment, but for simplicity we're doing this.
        // A transaction would be better here.
        const existingProduct = products.find(p => p.id === item.productId);
        if (existingProduct) {
            batch.update(productRef, { stock: existingProduct.stock + item.quantity });
        }
    });

    await batch.commit();

    toast({
        title: 'Purchase Added',
        description: 'The new purchase has been recorded and stock levels updated.',
    });
    onSuccess();
    form.reset();
  }

  return (
    <>
      <CreateSupplierDialog
        open={isCreateSupplierOpen}
        onOpenChange={setCreateSupplierOpen}
        onSupplierCreated={handleLocalSupplierCreated}
      />
      <Form {...form}>
        <form ref={ref} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6 items-end">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={handleSupplierChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                        ))}
                        <SelectItem value="create-new" className="text-primary focus:text-primary">
                          <span className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> Create New Supplier
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 p-4 border rounded-md relative items-end">
                      <p className="col-span-12 text-sm font-medium">Item {index + 1}</p>
                      <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                          <FormItem className="col-span-12 md:col-span-6">
                              <FormLabel>Product</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select a product" />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                  {products.map(product => (
                                      <SelectItem key={product.id} value={product.id}>{product.name} ({product.reference})</SelectItem>
                                  ))}
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                          <FormItem className="col-span-6 md:col-span-3">
                              <FormLabel>Quantity</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                          </FormItem>
                          )}
                      />
                     <FormField
                          control={form.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                          <FormItem className="col-span-6 md:col-span-3">
                              <FormLabel>Purchase Price</FormLabel>
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
                onClick={() => append({ productId: '', quantity: 1, price: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardContent>
          </Card>
          
          <button type="submit" className="hidden"></button>
        </form>
      </Form>
    </>
  );
});

AddPurchaseForm.displayName = "AddPurchaseForm";
