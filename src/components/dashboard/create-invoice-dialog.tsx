'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { CreateInvoiceForm } from './create-invoice-form';
import type { Locale } from '@/lib/config';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';
import { canExport } from '@/lib/trial-utils';
import { TrialButtonLock } from '@/components/trial-button-lock';

type Dictionary = Awaited<ReturnType<typeof import('@/lib/dictionaries').getDictionary>>;

interface CreateInvoiceDialogProps {
  locale: Locale;
  dictionary: Dictionary;
  onInvoiceCreated?: () => void;
  defaultType?: 'INVOICE' | 'PURCHASE_ORDER' | 'DELIVERY_NOTE' | 'SALES_RECEIPT';
}

export function CreateInvoiceDialog({ locale, dictionary, onInvoiceCreated, defaultType }: CreateInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const { user, firestore } = useFirebase();
  const [userDoc, setUserDoc] = React.useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch user document
  React.useEffect(() => {
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

  const handleSuccess = () => {
    setOpen(false);
    if (onInvoiceCreated) {
      onInvoiceCreated();
    }
  };

  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  };

  return (
    <TrialButtonLock user={user}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {dictionary?.invoices?.addButton || 'Create Invoice'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dictionary?.invoices?.createDialogTitle || 'Create Invoice'}</DialogTitle>
            <DialogDescription>
              {dictionary?.invoices?.createDialogDescription || 'Create a new invoice with line items, VAT, and customer details.'}
            </DialogDescription>
          </DialogHeader>
          <CreateInvoiceForm
            ref={formRef}
            locale={locale}
            onSuccess={handleSuccess}
            defaultType={defaultType || 'INVOICE'}
            hideTypeSelector={true}
            onLoadingChange={setIsLoading}
          />
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              {(dictionary?.table as any)?.cancel || 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} type="button" disabled={isLoading}>
              {dictionary?.invoices?.generateInvoiceButton || 'Generate Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TrialButtonLock>
  );
}
