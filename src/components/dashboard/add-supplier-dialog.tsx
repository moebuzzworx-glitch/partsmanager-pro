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

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  contactName: z.string().optional(),
  address: z.string().optional(),
  rc: z.string().optional(),
  nis: z.string().optional(),
  nif: z.string().optional(),
  rib: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface AddSupplierDialogProps {
  dictionary?: any;
  onSupplierAdded?: () => void;
}

export function AddSupplierDialog({ dictionary, onSupplierAdded }: AddSupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [userDoc, setUserDoc] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      contactName: '',
      address: '',
      rc: '',
      nis: '',
      nif: '',
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

  const onSubmit = async (data: SupplierFormData) => {
    // Check permissions
    if (!canWrite(userDoc)) {
      const message = getExportRestrictionMessage(userDoc) || 'You do not have permission to add suppliers.';
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

      const suppliersRef = collection(firestore, 'suppliers');
      await addDoc(suppliersRef, {
        ...data,
        userId: user.uid,
        version: 1,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Success',
        description: dictionary?.addSupplierDialog?.addSuccess || 'Supplier added successfully.',
      });

      form.reset();
      setOpen(false);
      onSupplierAdded?.();
    } catch (error: any) {
      console.error('Error adding supplier:', error);
      toast({
        title: 'Error',
        description: dictionary?.addSupplierDialog?.addError || error.message || 'Failed to add supplier. Please try again.',
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
            <PlusCircle className="me-2 h-4 w-4" />
            {dictionary?.addSupplierDialog?.submit || 'Add Supplier'}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{dictionary?.addSupplierDialog?.title || 'Add New Supplier'}</DialogTitle>
            <DialogDescription>
              {dictionary?.addSupplierDialog?.description || 'Add a new supplier to your database with contact and identification information.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dictionary?.addSupplierDialog?.supplierName || 'Supplier Name*'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.addSupplierDialog?.supplierNamePlaceholder || 'e.g., XYZ Imports'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.addSupplierDialog?.contactName || 'Contact Name (Optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.addSupplierDialog?.contactNamePlaceholder || 'Name of contact person'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.addSupplierDialog?.email || 'Email*'}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder={dictionary?.addSupplierDialog?.emailPlaceholder || 'supplier@example.com'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.addSupplierDialog?.phone || 'Phone*'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.addSupplierDialog?.phonePlaceholder || '+213 XXX XXX XXX'} disabled={isLoading} />
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
                    <FormLabel>{dictionary?.addSupplierDialog?.address || 'Address (Optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={dictionary?.addSupplierDialog?.addressPlaceholder || 'Street address'} disabled={isLoading} />
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
                      <FormLabel>{dictionary?.addSupplierDialog?.rc || 'RC (Optional)'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={dictionary?.addSupplierDialog?.rcPlaceholder || 'Registration Code'} disabled={isLoading} />
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
                      <FormLabel>{dictionary?.addSupplierDialog?.nis || 'NIS (Optional)'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={dictionary?.addSupplierDialog?.nisPlaceholder || 'NIS Number'} disabled={isLoading} />
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
                      <FormLabel>{dictionary?.addSupplierDialog?.nif || 'NIF (Optional)'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={dictionary?.addSupplierDialog?.nifPlaceholder || 'NIF Number'} disabled={isLoading} />
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
                      <FormLabel>{dictionary?.addSupplierDialog?.rib || 'RIB (Optional)'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={dictionary?.addSupplierDialog?.ribPlaceholder || 'Bank Account RIB'} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                  {dictionary?.addSupplierDialog?.cancel || 'Cancel'}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {dictionary?.addSupplierDialog?.submit || 'Add Supplier'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TrialButtonLock>
  );
}
