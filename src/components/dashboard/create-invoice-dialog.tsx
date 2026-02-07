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
import { CreateInvoiceForm, CreateInvoiceFormRef } from './create-invoice-form';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User as AppUser } from '@/lib/types';
import { TrialButtonLock } from '@/components/trial-button-lock';
import type { Locale } from '@/lib/config';

export interface CreateInvoiceDialogRef {
  handleScan: (productId: string) => void;
}

interface CreateInvoiceDialogProps {
  locale: Locale;
  dictionary: any;
  onInvoiceCreated?: () => void;
  defaultType?: 'INVOICE' | 'TERM_INVOICE' | 'DELIVERY_NOTE' | 'SALES_RECEIPT' | 'PURCHASE_ORDER';
  initialData?: {
    clientName?: string;
    clientAddress?: string;
    clientNis?: string;
    clientNif?: string;
    clientRc?: string;
    clientArt?: string;
    clientRib?: string;
    lineItems?: { reference?: string; designation: string; quantity: number; unitPrice: number; unit?: string }[];
    paymentMethod?: string;
    applyVatToAll?: boolean;
    applyTimbre?: boolean;
  };
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export const CreateInvoiceDialog = React.forwardRef<CreateInvoiceDialogRef, CreateInvoiceDialogProps>(({ locale, dictionary, onInvoiceCreated, defaultType, initialData, externalOpen, onExternalOpenChange, hideTrigger }, ref) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onExternalOpenChange || setInternalOpen;
  const formRef = React.useRef<CreateInvoiceFormRef>(null);
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

  React.useImperativeHandle(ref, () => ({
    handleScan: (productId: string) => {
      setOpen(true);
      // We need to wait for the dialog to open and form to mount
      setTimeout(() => {
        formRef.current?.handleScan(productId);
      }, 100);
    }
  }));

  const handleSuccess = () => {
    setOpen(false);
    if (onInvoiceCreated) {
      onInvoiceCreated();
    }
  };

  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <TrialButtonLock user={user}>
      <Dialog open={open} onOpenChange={setOpen}>
        {!hideTrigger && (
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              {dictionary?.invoices?.addButton || 'Create Invoice'}
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dictionary?.invoices?.createDialogTitle || 'Create Invoice'}</DialogTitle>
            <DialogDescription>
              {dictionary?.invoices?.createDialogDescription || 'Create a new invoice with line items, VAT, and customer details.'}
            </DialogDescription>
          </DialogHeader>
          <CreateInvoiceForm
            ref={formRef}
            documentType={defaultType || 'INVOICE'}
            dictionary={dictionary}
            onSuccess={handleSuccess}
            hideTypeSelector={true}
            onLoadingChange={setIsLoading}
            initialData={initialData}
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
});

CreateInvoiceDialog.displayName = 'CreateInvoiceDialog';
