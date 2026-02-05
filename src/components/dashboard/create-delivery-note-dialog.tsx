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

interface CreateDeliveryNoteDialogProps {
    locale: Locale;
    dictionary: Dictionary;
    onCreated?: () => void;
}

export function CreateDeliveryNoteDialog({ locale, dictionary, onCreated }: CreateDeliveryNoteDialogProps) {
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
                        {dictionary?.invoices?.createDeliveryNoteButton || 'New Delivery Note'}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{dictionary?.invoices?.createDeliveryNoteTitle || 'Create Delivery Note'}</DialogTitle>
                        <DialogDescription>
                            {dictionary?.invoices?.createDeliveryNoteDescription || 'Create a new delivery note for your customers.'}
                        </DialogDescription>
                    </DialogHeader>
                    <CreateInvoiceForm
                        ref={formRef}
                        dictionary={dictionary}
                        onSuccess={handleSuccess}
                        documentType="DELIVERY_NOTE"
                        hideTypeSelector={true}
                    />
                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {(dictionary?.table as any)?.cancel || 'Annuler'}
                        </Button>
                        <Button onClick={handleSubmit} type="button">
                            {dictionary?.invoices?.generateDeliveryNoteButton || 'Generate Delivery Note'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TrialButtonLock>
    );
}
