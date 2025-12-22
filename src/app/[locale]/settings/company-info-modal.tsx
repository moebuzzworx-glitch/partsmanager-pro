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
import { Save, Edit } from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { getUserSettings, saveUserSettings } from '@/lib/settings-utils';

const companyInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  address: z.string().min(1, 'Address is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  rc: z.string().min(1, 'R.C is required.'),
  nif: z.string().min(1, 'NIF is required.'),
  art: z.string().optional(),
  nis: z.string().optional(),
  rib: z.string().optional(),
});

export type CompanyInfo = z.infer<typeof companyInfoSchema>;

export function CompanyInfoModal() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { firestore, user, isUserLoading } = useFirebase();
  const form = useForm<CompanyInfo>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      companyName: '',
      address: '',
      phone: '',
      rc: '',
      nif: '',
      art: '',
      nis: '',
      rib: '',
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (user && firestore && !isUserLoading) {
          const settings = await getUserSettings(firestore, user.uid);
          const info = {
            companyName: settings.companyName || '',
            address: settings.address || '',
            phone: settings.phone || '',
            rc: settings.rc || '',
            nif: settings.nif || '',
            art: settings.art || '',
            nis: settings.nis || '',
            rib: settings.rib || '',
          };
          if (!cancelled) form.reset(info);
          return;
        }

        // Fallback to localStorage
        const storedInfo = localStorage.getItem('companyInfo');
        if (storedInfo && !cancelled) {
          form.reset(JSON.parse(storedInfo));
        }
      } catch (error) {
        console.error('Could not retrieve company info', error);
      }
    })();
    return () => { cancelled = true };
  }, [form]);

  function onSubmit(values: CompanyInfo) {
    try {
      localStorage.setItem('companyInfo', JSON.stringify(values));
      // Persist to Firestore when available
      (async () => {
        try {
          if (user && firestore) {
            await saveUserSettings(firestore, user.uid, {
              companyName: values.companyName,
              address: values.address,
              phone: values.phone,
              rc: values.rc,
              nif: values.nif,
              art: values.art,
              nis: values.nis,
              rib: values.rib,
            });
          }
        } catch (e) {
          console.error('Failed to save company info to Firestore', e);
        }
      })();
      toast({
        title: 'Information Saved',
        description: 'Your company details have been updated.',
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error Saving',
        description: 'Could not save company information.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Edit className="mr-2 h-4 w-4" />
          Edit Company Information
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company Information</DialogTitle>
          <DialogDescription>
            This information will be displayed on your invoices.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your Company Name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+213 XXX XXX XXX" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Street address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>R.C (Registre de Commerce) *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="RC Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF (Numéro d'Identification Fiscale) *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="NIF Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="art"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ART (Article d'imposition)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ART Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIS (Numéro d'Identification Statistique)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="NIS Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rib"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RIB (Relevé d'Identité Bancaire)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Bank Account RIB" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Information
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
