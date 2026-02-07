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
import type { Locale } from '@/lib/config';
import { useFirebase } from '@/firebase';
import { TrialButtonLock } from '@/components/trial-button-lock';

type Dictionary = Awaited<ReturnType<typeof import('@/lib/dictionaries').getDictionary>>;

export interface CreateDeliveryNoteDialogRef {
    handleScan: (productId: string) => void;
}

interface CreateDeliveryNoteDialogProps {
    locale: Locale;
    dictionary: Dictionary;
    onCreated?: () => void;
    externalOpen?: boolean;
    onExternalOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
}

export const CreateDeliveryNoteDialog = React.forwardRef<CreateDeliveryNoteDialogRef, CreateDeliveryNoteDialogProps>(
    ({ locale, dictionary, onCreated, externalOpen, onExternalOpenChange, hideTrigger }, ref) => {
        const [internalOpen, setInternalOpen] = React.useState(false);
        const open = externalOpen !== undefined ? externalOpen : internalOpen;
        const setOpen = onExternalOpenChange || setInternalOpen;
        const formRef = React.useRef<CreateInvoiceFormRef>(null);
        const { user } = useFirebase();
        const [isLoading, setIsLoading] = React.useState(false);

        React.useImperativeHandle(ref, () => ({
            handleScan: (productId: string) => {
                setOpen(true);
                setTimeout(() => {
                    formRef.current?.handleScan(productId);
                }, 100);
            }
        }));

        const handleSuccess = () => {
            setOpen(false);
            if (onCreated) {
                onCreated();
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
                                {dictionary?.invoices?.createDeliveryNoteButton || 'New Delivery Note'}
                            </Button>
                        </DialogTrigger>
                    )}
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
                            onLoadingChange={setIsLoading}
                        />
                        <DialogFooter className="mt-6 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                                {(dictionary?.table as any)?.cancel || 'Annuler'}
                            </Button>
                            <Button onClick={handleSubmit} type="button" disabled={isLoading}>
                                {dictionary?.invoices?.generateDeliveryNoteButton || 'Generate Delivery Note'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </TrialButtonLock>
        );
    });

CreateDeliveryNoteDialog.displayName = 'CreateDeliveryNoteDialog';
