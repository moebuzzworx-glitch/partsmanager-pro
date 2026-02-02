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

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  address: z.string().optional(),
  rc: z.string().optional(),
  nis: z.string().optional(),
  nif: z.string().optional(),
  rib: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface Supplier extends SupplierFormData {
  id: string;
}

interface EditSupplierDialogProps {
  dictionary?: any;
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierUpdated?: () => void;
}

export function EditSupplierDialog({ dictionary, supplier, open, onOpenChange, onSupplierUpdated }: EditSupplierDialogProps) {
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      contactName: supplier.contactName || '',
      address: supplier.address || '',
      rc: supplier.rc || '',
      nis: supplier.nis || '',
      nif: supplier.nif || '',
      rib: supplier.rib || '',
    },
  });

  // Reset form when supplier changes
  useEffect(() => {
    form.reset({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      contactName: supplier.contactName || '',
      address: supplier.address || '',
      rc: supplier.rc || '',
      nis: supplier.nis || '',
      nif: supplier.nif || '',
      rib: supplier.rib || '',
    });
  }, [supplier, form]);

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

  const onSubmit = async (data: SupplierFormData) => {
    // Check permissions
    if (!canWrite(userDoc)) {
      const message = getExportRestrictionMessage(userDoc) || 'You do not have permission to edit suppliers.';
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
      const supplierRef = doc(firestore, 'suppliers', supplier.id);
      await updateDoc(supplierRef, {
        ...data,
        updatedAt: new Date(),
      });

      toast({
        title: 'Success',
        description: dictionary?.editSupplierDialog?.updateSuccess || 'Supplier updated successfully.',
      });

      onOpenChange(false);
      onSupplierUpdated?.();
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast({
        title: 'Error',
        description: dictionary?.editSupplierDialog?.updateError || error.message || 'Failed to update supplier. Please try again.',
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
          <DialogTitle>{dictionary?.editSupplierDialog?.title || 'Edit Supplier'}</DialogTitle>
          <DialogDescription>
            {dictionary?.editSupplierDialog?.description || 'Update supplier information and identification details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.editSupplierDialog?.supplierName || 'Supplier Name*'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.editSupplierDialog?.supplierNamePlaceholder || 'e.g., ABC Supply Co'} disabled={isLoading} />
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
                  <FormLabel>{dictionary?.editSupplierDialog?.email || 'Email'}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder={dictionary?.editSupplierDialog?.emailPlaceholder || 'supplier@example.com'} disabled={isLoading} />
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
                  <FormLabel>{dictionary?.editSupplierDialog?.phone || 'Phone'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.editSupplierDialog?.phonePlaceholder || '+213 XXX XXX XXX'} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary?.editSupplierDialog?.contactName || 'Contact Name'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.editSupplierDialog?.contactNamePlaceholder || 'Contact person name'} disabled={isLoading} />
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
                  <FormLabel>{dictionary?.editSupplierDialog?.address || 'Address'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={dictionary?.editSupplierDialog?.addressPlaceholder || 'Street address'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.editSupplierDialog?.rc || 'RC'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.editSupplierDialog?.rcPlaceholder || 'Registration Code'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.editSupplierDialog?.nis || 'NIS'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.editSupplierDialog?.nisPlaceholder || 'NIS Number'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.editSupplierDialog?.nif || 'NIF'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.editSupplierDialog?.nifPlaceholder || 'NIF Number'} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rib"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.editSupplierDialog?.rib || 'RIB'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.editSupplierDialog?.ribPlaceholder || 'Bank Account RIB'} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {dictionary?.editSupplierDialog?.cancel || 'Cancel'}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dictionary?.editSupplierDialog?.submit || 'Update Supplier'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
