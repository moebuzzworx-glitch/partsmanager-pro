'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';
import { canWrite, getExportRestrictionMessage, isTrialExpired } from '@/lib/trial-utils';
import { TrialButtonLock } from '@/components/trial-button-lock';

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  rc: z.string().optional(),
  nis: z.string().optional(),
  nif: z.string().optional(),
  art: z.string().optional(),
  rib: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer extends CustomerFormData {
  id: string;
}

interface EditCustomerDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerUpdated?: () => void;
  dictionary?: any;
}

export function EditCustomerDialog({ customer, open, onOpenChange, onCustomerUpdated, dictionary }: EditCustomerDialogProps) {
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      rc: customer.rc || '',
      nis: customer.nis || '',
      nif: customer.nif || '',
      art: customer.art || '',
      rib: customer.rib || '',
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    form.reset({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      rc: customer.rc || '',
      nis: customer.nis || '',
      nif: customer.nif || '',
      art: customer.art || '',
      rib: customer.rib || '',
    });
  }, [customer, form]);

  // Fetch user document to check permissions
  useEffect(() => {
    if (!user || !firestore) return;

    const fetchUserDoc = async () => {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserDoc(userDocSnap.data() as AppUser);
        }
      } catch (error) {
        console.error('Error fetching user document:', error);
      }
    };

    fetchUserDoc();
  }, [user, firestore]);

  // Auto-close dialog if user becomes expired
  useEffect(() => {
    if (open && (user?.subscription === 'expired' || (userDoc && isTrialExpired(userDoc)))) {
      onOpenChange(false);
    }
  }, [user, userDoc, open, onOpenChange]);

  const onSubmit = async (data: CustomerFormData) => {
    // Check permissions
    if (!canWrite(userDoc)) {
      const message = getExportRestrictionMessage(userDoc) || 'You do not have permission to edit customers.';
      toast({
        title: 'Permission Denied',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (!firestore) {
      toast({
        title: 'Error',
        description: 'Firestore not initialized.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const customerRef = doc(firestore, 'customers', customer.id);
      await updateDoc(customerRef, {
        ...data,
        updatedAt: new Date(),
      });

      toast({
        title: 'Success',
        description: dictionary?.editCustomerDialog?.updateSuccess || 'Customer updated successfully.',
      });

      onOpenChange(false);
      onCustomerUpdated?.();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast({
        title: 'Error',
        description: dictionary?.editCustomerDialog?.updateError || error.message || 'Failed to update customer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{dictionary?.editCustomerDialog?.title || 'Edit Customer'}</DialogTitle>
          <DialogDescription>
            {dictionary?.editCustomerDialog?.description || 'Update customer information and identification details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.editCustomerDialog?.customerName || 'Customer Name*'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.editCustomerDialog?.customerNamePlaceholder || 'e.g., ABC Company'} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.editCustomerDialog?.email || 'Email'}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder={dictionary?.editCustomerDialog?.emailPlaceholder || 'customer@example.com'} disabled={isLoading} />
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
                  <FormLabel>{dictionary?.editCustomerDialog?.phone || 'Phone'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.editCustomerDialog?.phonePlaceholder || '+213 XXX XXX XXX'} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.editCustomerDialog?.address || 'Address'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.editCustomerDialog?.addressPlaceholder || 'Street address'} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="rc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.editCustomerDialog?.rc || 'RC'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.editCustomerDialog?.rcPlaceholder || 'Registration Code'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.editCustomerDialog?.nis || 'NIS'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.editCustomerDialog?.nisPlaceholder || 'NIS Number'} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.editCustomerDialog?.nif || 'NIF'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.editCustomerDialog?.nifPlaceholder || 'NIF Number'} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="art"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.editCustomerDialog?.art || 'ART'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.editCustomerDialog?.artPlaceholder || 'ART Number'} disabled={isLoading} />
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
                  <FormLabel>{dictionary?.editCustomerDialog?.rib || 'RIB'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.editCustomerDialog?.ribPlaceholder || 'Bank Account RIB'} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {dictionary?.editCustomerDialog?.cancel || 'Cancel'}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dictionary?.editCustomerDialog?.submit || 'Update Customer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
