 'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { useFirebase } from '@/firebase/provider';
import { getUserSettings, saveUserSettings } from '@/lib/settings-utils';
import { Save, Edit, Percent, Loader2 } from 'lucide-react';

const businessRulesSchema = z.object({
  profitMargin: z.coerce.number().min(0, 'Profit margin cannot be negative.'),
  defaultVat: z.coerce.number().min(0, 'VAT cannot be negative.').max(100, 'VAT cannot exceed 100%'),
});

export type BusinessRulesData = z.infer<typeof businessRulesSchema>;

export function BusinessRulesModal() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { firestore, user, isUserLoading } = useFirebase();

  const form = useForm<BusinessRulesData>({
    resolver: zodResolver(businessRulesSchema),
    defaultValues: {
      profitMargin: 25,
      defaultVat: 19,
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (user && firestore && !isUserLoading) {
          const settings = await getUserSettings(firestore, user.uid);
          form.reset({
            profitMargin: settings.profitMargin ?? 25,
            defaultVat: (settings as any).defaultVat ?? 19,
          });
          return;
        }

        const storedMargin = localStorage.getItem('profitMargin');
        const storedVat = localStorage.getItem('defaultVat');
        if (!cancelled) {
          form.reset({
            profitMargin: storedMargin ? parseFloat(storedMargin) : 25,
            defaultVat: storedVat ? parseFloat(storedVat) : 19,
          });
        }
      } catch (error) {
        console.error('Could not retrieve business rules from local storage', error);
      }
    })();
    return () => { cancelled = true };
  }, [form]);

  async function onSubmit(values: BusinessRulesData) {
    setIsLoading(true);
    try {
      localStorage.setItem('profitMargin', values.profitMargin.toString());
      localStorage.setItem('defaultVat', values.defaultVat.toString());

      // Persist to Firestore when available
      if (user && firestore) {
        await saveUserSettings(firestore, user.uid, {
          profitMargin: values.profitMargin,
          // store defaultVat under the same shape (AppSettings doesn't have defaultVat, but it's okay to add)
          defaultVat: values.defaultVat,
        } as any);
      }

      toast({
        title: 'Business Rules Saved',
        description: `Profit margin set to ${values.profitMargin}% and VAT to ${values.defaultVat}%.`,
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to save business rules:', error);
      toast({
        title: 'Error Saving',
        description: 'Could not save business rules.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Edit className="mr-2 h-4 w-4" />
          Edit Business Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Business Rules</DialogTitle>
          <DialogDescription>
            Set default values for business logic and pricing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="profitMargin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Profit Margin (%)</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        {...field} 
                        placeholder="25"
                        className="pl-8" 
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultVat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default VAT Logic (%)</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        {...field} 
                        placeholder="19"
                        className="pl-8" 
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Rules
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
