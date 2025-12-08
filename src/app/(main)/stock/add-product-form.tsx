
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { addProductOrUpdateStock } from '@/firebase/atomic-updates';

const formSchema = z.object({
  designation: z.string().min(2, {
    message: 'Designation must be at least 2 characters.',
  }),
  reference: z.string().optional(),
  brand: z.string().min(1, { message: 'Marque is required.' }),
  quantity: z.coerce.number().int().min(0, { message: 'Quantity cannot be negative.' }),
  purchasePrice: z.coerce.number().positive({ message: 'Purchase price must be positive.' }),
});

interface AddProductFormProps {
    onSuccess: () => void;
    products: Product[];
}

const getProfitMargin = (): number => {
    try {
        const storedMargin = localStorage.getItem('profitMargin');
        if (storedMargin) {
            const margin = parseFloat(storedMargin);
            if (!isNaN(margin)) {
                return margin;
            }
        }
    } catch (error) {
        console.error("Could not retrieve profit margin from local storage", error);
    }
    // Defaulting to 25% if nothing is stored or if it's invalid
    return 25;
};

export function AddProductForm({ onSuccess, products }: AddProductFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      designation: '',
      reference: '',
      brand: '',
      quantity: 0,
      purchasePrice: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
        toast({ title: 'Error', description: 'Database not available.', variant: 'destructive'});
        return;
    }
    setIsLoading(true);
    
    try {
      const margin = getProfitMargin();
      const markup = 1 + (margin / 100);
      const productData = {
        name: values.designation,
        reference: values.reference || '',
        brand: values.brand,
        stock: values.quantity,
        purchasePrice: values.purchasePrice,
        price: values.purchasePrice * markup,
        deletedAt: null,
      };

      await addProductOrUpdateStock(firestore, productData, products);

      toast({
        title: 'Product Processed!',
        description: `${values.designation} has been added or updated in the inventory.`,
      });
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Failed to add or update product", error);
      toast({
        title: 'Operation Failed',
        description: 'Could not add or update the product. Please try again.',
        variant: 'destructive',
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Désignation</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Excavator Bucket" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Référence (Unique ID)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., EB-HD-001" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marque</FormLabel>
              <FormControl>
                <Input placeholder="e.g., CAT" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Quantity to Add</FormLabel>
                <FormControl>
                    <Input type="number" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="purchasePrice"
            render={({ field }) => (
                <FormItem>
                <FormLabel>PRIX ACHAT ($)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit" className='w-full' disabled={isLoading}>
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <PackagePlus />
                    Add/Update Product
                </>
            )}
        </Button>
      </form>
    </Form>
  );
}
