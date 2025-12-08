
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Loader2, Save } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Product } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  reference: z.string().optional(),
  brand: z.string().min(1, { message: 'Brand is required.' }),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.'),
  purchasePrice: z.coerce.number().positive('Purchase price must be positive.'),
  price: z.coerce.number().positive('Selling price must be positive.'),
});

type EditProductFormData = z.infer<typeof formSchema>;

interface EditProductDialogProps {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
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
    return 25; // Default margin
};

export function EditProductDialog({ product, onOpenChange }: EditProductDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const firestore = useFirestore();

  const form = useForm<EditProductFormData>({
    resolver: zodResolver(formSchema),
  });

  const purchasePrice = form.watch('purchasePrice');

  React.useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        reference: product.reference,
        brand: product.brand,
        stock: product.stock,
        purchasePrice: product.purchasePrice,
        price: product.price,
      });
    }
  }, [product, form]);
  
  React.useEffect(() => {
    if (purchasePrice > 0) {
        const margin = getProfitMargin();
        const markup = 1 + (margin / 100);
        const newPrice = purchasePrice * markup;
        form.setValue('price', newPrice);
    }
  }, [purchasePrice, form]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };


  async function onSubmit(values: EditProductFormData) {
    if (!firestore || !product) {
        toast({ title: 'Error', description: 'Database not available or no product selected.', variant: 'destructive'});
        return;
    }
    setIsLoading(true);

    try {
        const productRef = doc(firestore, 'products', product.id);
        await updateDoc(productRef, values);
        
        toast({
            title: 'Product Updated',
            description: `${values.name} has been successfully updated.`,
        });
        handleOpenChange(false);
    } catch (error) {
        console.error("Failed to update product:", error);
        toast({
            title: 'Update Failed',
            description: 'An error occurred while updating the product.',
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Make changes to the product details here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
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
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
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
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
                <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Purchase Price</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Selling Price</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} disabled={true} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
