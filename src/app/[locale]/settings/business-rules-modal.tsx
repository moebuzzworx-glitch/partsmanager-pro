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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { getUserSettings, saveUserSettings } from '@/lib/settings-utils';
import { recalculateAllProductPrices } from '@/lib/recalculate-prices';
import { Save, Edit, Percent, Loader2 } from 'lucide-react';

const getBusinessRulesSchema = (dictionary?: any) => z.object({
  profitMargin: z.coerce.number().min(0, dictionary?.settings?.profitMarginError || 'Profit margin cannot be negative.'),
  defaultVat: z.coerce.number().min(0, dictionary?.settings?.vatMinError || 'VAT cannot be negative.').max(100, dictionary?.settings?.vatMaxError || 'VAT cannot exceed 100%'),
  defaultTimbre: z.coerce.number().min(0, dictionary?.settings?.timbreMinError || 'Timbre cannot be negative.').default(1),
});

export type BusinessRulesData = z.infer<ReturnType<typeof getBusinessRulesSchema>>;

export function BusinessRulesModal({ dictionary }: { dictionary?: any }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [recalculateProgress, setRecalculateProgress] = useState<string | null>(null);
  const { toast } = useToast();

  const { firestore, user, isUserLoading } = useFirebase();
  const businessRulesSchema = getBusinessRulesSchema(dictionary);

  const form = useForm<BusinessRulesData>({
    resolver: zodResolver(businessRulesSchema),
    defaultValues: {
      profitMargin: 25,
      defaultVat: 19,
      defaultTimbre: 1,
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
            defaultTimbre: (settings as any).defaultTimbre ?? 1,
          });
          return;
        }

        const storedMargin = localStorage.getItem('profitMargin');
        const storedVat = localStorage.getItem('defaultVat');
        const storedTimbre = localStorage.getItem('defaultTimbre');
        if (!cancelled) {
          form.reset({
            profitMargin: storedMargin ? parseFloat(storedMargin) : 25,
            defaultVat: storedVat ? parseFloat(storedVat) : 19,
            defaultTimbre: storedTimbre ? parseFloat(storedTimbre) : 1,
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
    setRecalculateProgress(null);
    try {
      localStorage.setItem('profitMargin', values.profitMargin.toString());
      localStorage.setItem('defaultVat', values.defaultVat.toString());
      localStorage.setItem('defaultTimbre', values.defaultTimbre.toString());

      // Persist to Firestore when available
      if (user && firestore) {
        await saveUserSettings(firestore, user.uid, {
          profitMargin: values.profitMargin,
          defaultVat: values.defaultVat,
          defaultTimbre: values.defaultTimbre,
        } as any);
      }

      // If user wants to apply to existing products, recalculate all prices
      if (applyToExisting && user) {
        setRecalculateProgress(dictionary?.settings?.recalculatingPrices || 'Recalculating prices...');

        const result = await recalculateAllProductPrices(
          user,
          firestore,
          values.profitMargin,
          (progress, message) => {
            setRecalculateProgress(message);
          }
        );

        toast({
          title: dictionary?.settings?.pricesUpdatedSuccess || 'Prices Updated',
          description: (dictionary?.settings?.pricesUpdatedDescription || 'Updated {count} product prices with {margin}% margin.')
            .replace('{count}', result.updated.toString())
            .replace('{margin}', values.profitMargin.toString()),
        });
      } else {
        toast({
          title: dictionary?.settings?.businessRulesSaveSuccess || 'Business Rules Saved',
          description: `${dictionary?.settings?.profitMargin || 'Profit margin'} set to ${values.profitMargin}% and ${dictionary?.settings?.defaultVAT || 'VAT'} to ${values.defaultVat}%.`,
        });
      }

      setApplyToExisting(false);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save business rules:', error);
      toast({
        title: dictionary?.settings?.saveError || 'Error Saving',
        description: dictionary?.settings?.businessRulesSaveError || 'Could not save business rules.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setRecalculateProgress(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Edit className="mr-2 h-4 w-4" />
          {dictionary?.settings?.businessRulesEditButton || 'Edit Business Rules'}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{dictionary?.settings?.businessRulesDialogTitle || 'Edit Business Rules'}</DialogTitle>
          <DialogDescription>
            {dictionary?.settings?.businessRulesDialogDescription || 'Set default values for business logic and pricing.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" dir="inherit">
            <FormField
              control={form.control}
              name="profitMargin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.settings?.profitMargin || 'Default Profit Margin'} (%)</FormLabel>
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
                  <FormLabel>{dictionary?.settings?.defaultVAT || 'Default VAT'} (%)</FormLabel>
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

            <FormField
              control={form.control}
              name="defaultTimbre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.settings?.defaultTimbre || 'Default Timbre (Stamp Duty)'} (%)</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        placeholder="1"
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

            {/* Apply to existing products checkbox */}
            <div className="flex flex-col gap-3 p-4 border border-dashed border-primary/30 rounded-md bg-primary/5">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="apply-to-existing"
                  checked={applyToExisting}
                  onCheckedChange={(checked) => setApplyToExisting(checked === true)}
                  disabled={isLoading}
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="apply-to-existing" className="text-sm font-medium cursor-pointer">
                    {dictionary?.settings?.applyToExisting || 'Apply to existing products'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {dictionary?.settings?.applyToExistingDescription || 'Recalculate selling prices for all existing products using the new profit margin.'}
                  </p>
                </div>
              </div>

              {recalculateProgress && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{recalculateProgress}</span>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {dictionary?.settings?.cancelButton || 'Cancel'}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {dictionary?.table?.saving || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {dictionary?.settings?.saveButton || 'Save Rules'}
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
