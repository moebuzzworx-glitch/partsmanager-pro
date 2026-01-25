'use client';

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
import { PlusCircle, Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';
import { canWrite, getExportRestrictionMessage } from '@/lib/trial-utils';
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

interface AddCustomerDialogProps {
  onCustomerAdded?: () => void;
  dictionary?: any;
}

export function AddCustomerDialog({ onCustomerAdded, dictionary }: AddCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      rc: '',
      nis: '',
      nif: '',
      art: '',
      rib: '',
    },
  });

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
      const message = getExportRestrictionMessage(userDoc) || 'You do not have permission to add customers.';
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
      if (!user?.uid) {
        toast({
          title: 'Error',
          description: 'User ID not available. Please log in again.',
          variant: 'destructive',
        });
        return;
      }

      const customersRef = collection(firestore, 'customers');
      await addDoc(customersRef, {
        ...data,
        userId: user.uid,
        version: 1,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Success',
        description: dictionary?.addCustomerDialog?.addSuccess || 'Customer added successfully.',
      });

      form.reset();
      setOpen(false);
      onCustomerAdded?.();
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast({
        title: 'Error',
        description: error.message || dictionary?.addCustomerDialog?.addError || 'Failed to add customer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TrialButtonLock user={userDoc}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {dictionary?.addCustomerDialog?.submit || 'Add Customer'}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{dictionary?.addCustomerDialog?.title || 'Add New Customer'}</DialogTitle>
            <DialogDescription>
              {dictionary?.addCustomerDialog?.description || 'Add a new customer to your database with contact and identification information.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.addCustomerDialog?.customerName || 'Customer Name*'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.addCustomerDialog?.customerNamePlaceholder || 'e.g., ABC Company'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.addCustomerDialog?.email || 'Email*'}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder={dictionary?.addCustomerDialog?.emailPlaceholder || 'customer@example.com'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.addCustomerDialog?.phone || 'Phone*'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.addCustomerDialog?.phonePlaceholder || '+213 XXX XXX XXX'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.addCustomerDialog?.address || 'Address (Optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.addCustomerDialog?.addressPlaceholder || 'Street address'} disabled={isLoading} />
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
                      <FormLabel>{dictionary?.addCustomerDialog?.rc || 'RC (Optional)'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={dictionary?.addCustomerDialog?.rcPlaceholder || 'Registration Code'} disabled={isLoading} />
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
                      <FormLabel>{dictionary?.addCustomerDialog?.nis || 'NIS (Optional)'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={dictionary?.addCustomerDialog?.nisPlaceholder || 'NIS Number'} disabled={isLoading} />
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
                      <FormLabel>{dictionary?.addCustomerDialog?.nif || 'NIF (Optional)'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={dictionary?.addCustomerDialog?.nifPlaceholder || 'NIF Number'} disabled={isLoading} />
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
                      <FormLabel>{dictionary?.addCustomerDialog?.art || 'ART (Optional)'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={dictionary?.addCustomerDialog?.artPlaceholder || 'ART Number'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.addCustomerDialog?.rib || 'RIB (Optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.addCustomerDialog?.ribPlaceholder || 'Bank Account RIB'} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                  {dictionary?.addCustomerDialog?.cancel || 'Cancel'}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dictionary?.addCustomerDialog?.submit || 'Add Customer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TrialButtonLock>
  );
}
