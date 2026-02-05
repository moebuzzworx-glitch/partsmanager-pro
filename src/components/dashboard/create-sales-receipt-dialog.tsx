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
import { TrialButtonLock } from '@/components/trial-button-lock';

type Dictionary = Awaited<ReturnType<typeof import('@/lib/dictionaries').getDictionary>>;

interface CreateSalesReceiptDialogProps {
    locale: Locale;
    dictionary: Dictionary;
    onCreated?: () => void;
}

export function CreateSalesReceiptDialog({ locale, dictionary, onCreated }: CreateSalesReceiptDialogProps) {
    const [open, setOpen] = React.useState(false);
    const formRef = React.useRef<HTMLFormElement>(null);
    const { user } = useFirebase();

    const handleSuccess = () => {
        setOpen(false);
        if (onCreated) {
            onCreated();
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
                        {dictionary?.invoices?.createSalesReceiptButton || 'New Sales Receipt'}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{dictionary?.invoices?.createSalesReceiptTitle || 'Create Sales Receipt'}</DialogTitle>
                        <DialogDescription>
                            {dictionary?.invoices?.createSalesReceiptDescription || 'Create a new sales receipt for your customers.'}
                        </DialogDescription>
                    </DialogHeader>
                    <CreateInvoiceForm
                        ref={formRef}
                        locale={locale}
                        onSuccess={handleSuccess}
                        defaultType="SALES_RECEIPT"
                        hideTypeSelector={true}
                    />
                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {(dictionary?.table as any)?.cancel || 'Annuler'}
                        </Button>
                        <Button onClick={handleSubmit} type="button">
                            {dictionary?.invoices?.generateSalesReceiptButton || 'Generate Sales Receipt'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TrialButtonLock>
    );
}
