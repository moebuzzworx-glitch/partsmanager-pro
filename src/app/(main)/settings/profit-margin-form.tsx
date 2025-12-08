
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
import { useEffect, useState } from 'react';
import { Save, Percent, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import type { Product } from '@/lib/types';

const profitMarginSchema = z.object({
  margin: z.coerce.number().min(0, 'Margin cannot be negative.'),
});

export type ProfitMarginData = z.infer<typeof profitMarginSchema>;

export function ProfitMarginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);

  const { data: products } = useCollection<Product>(productsQuery);

  const form = useForm<ProfitMarginData>({
    resolver: zodResolver(profitMarginSchema),
    defaultValues: {
      margin: 25,
    },
  });

  useEffect(() => {
    try {
      const storedMargin = localStorage.getItem('profitMargin');
      if (storedMargin) {
        form.reset({ margin: parseFloat(storedMargin) });
      }
    } catch (error) {
        console.error("Could not retrieve profit margin from local storage", error);
    }
  }, [form]);

  async function onSubmit(values: ProfitMarginData) {
    setIsLoading(true);
    try {
        localStorage.setItem('profitMargin', values.margin.toString());

        if (firestore && products) {
            const batch = writeBatch(firestore);
            const markup = 1 + (values.margin / 100);

            products.forEach(product => {
                if(product.purchasePrice > 0) {
                    const newPrice = product.purchasePrice * markup;
                    const productRef = doc(firestore, 'products', product.id);
                    batch.update(productRef, { price: newPrice });
                }
            });

            await batch.commit();
        }

        toast({
          title: 'Profit Margin Saved',
          description: `The default margin has been set to ${values.margin}% and applied to all products.`,
        });
    } catch (error) {
        console.error('Failed to update product prices:', error);
        toast({
            title: 'Error Saving',
            description: 'Could not save the profit margin or update product prices.',
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="max-w-xs">
            <FormField
            control={form.control}
            name="margin"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Default Profit Margin (%)</FormLabel>
                <div className="relative">
                    <FormControl>
                        <Input type="number" step="0.1" {...field} className="pl-8" disabled={isLoading} />
                    </FormControl>
                    <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit" disabled={isLoading}>
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving and Updating Products...
                </>
             ) : (
                <>
                    <Save className='mr-2' />
                    Save Margin & Update Prices
                </>
             )
            }
        </Button>
      </form>
    </Form>
  );
}
