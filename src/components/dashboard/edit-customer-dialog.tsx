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
import { canWrite, getExportRestrictionMessage } from '@/lib/trial-utils';

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
}

export function EditCustomerDialog({ customer, open, onOpenChange, onCustomerUpdated }: EditCustomerDialogProps) {
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
        description: 'Customer updated successfully.',
      });

      onOpenChange(false);
      onCustomerUpdated?.();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update customer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer information and identification details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name*</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., ABC Company" disabled={isLoading} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="customer@example.com" disabled={isLoading} />
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
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+213 XXX XXX XXX" disabled={isLoading} />
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
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Street address" disabled={isLoading} />
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
                    <FormLabel>RC</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Registration Code" disabled={isLoading} />
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
                    <FormLabel>NIS</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="NIS Number" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="NIF Number" disabled={isLoading} />
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
                    <FormLabel>ART</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ART Number" disabled={isLoading} />
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
                  <FormLabel>RIB</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Bank Account RIB" disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Customer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
