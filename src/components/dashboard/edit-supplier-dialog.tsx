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
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierUpdated?: () => void;
}

export function EditSupplierDialog({ supplier, open, onOpenChange, onSupplierUpdated }: EditSupplierDialogProps) {
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
        description: 'Supplier updated successfully.',
      });

      onOpenChange(false);
      onSupplierUpdated?.();
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update supplier. Please try again.',
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
          <DialogTitle>Edit Supplier</DialogTitle>
          <DialogDescription>
            Update supplier information and identification details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name*</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., ABC Supply Co" disabled={isLoading} />
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
                    <Input {...field} type="email" placeholder="supplier@example.com" disabled={isLoading} />
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
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contact person name" disabled={isLoading} />
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
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Supplier
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
