'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { Loader2, CreditCard, ExternalLink, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    amount: number;
    clientName: string;
    invoiceNumber: string;
    onPaymentInitiated?: () => void;
    onPaymentComplete?: () => void;
    dictionary?: any;
}

type PaymentStatus = 'idle' | 'creating' | 'pending' | 'success' | 'failed';

export function PaymentDialog({
    open,
    onOpenChange,
    amount,
    clientName,
    invoiceNumber,
    onPaymentInitiated,
    onPaymentComplete,
    dictionary
}: PaymentDialogProps) {
    const { toast } = useToast();
    // ... (skip lines)
    <Button
        variant="ghost"
        onClick={() => onOpenChange(false)}
        className="w-full"
    >
        {dictionary?.table?.cancel || 'Cancel'}
    </Button>
    const { user } = useFirebase();
    const [status, setStatus] = React.useState<PaymentStatus>('idle');
    const [checkoutUrl, setCheckoutUrl] = React.useState<string | null>(null);
    const popupRef = React.useRef<Window | null>(null);
    const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // Extract payment type from invoice number
    const paymentType = invoiceNumber.startsWith('FIRST_PURCHASE')
        ? 'FIRST_PURCHASE'
        : invoiceNumber.startsWith('RENEWAL')
            ? 'RENEWAL'
            : 'UNKNOWN';

    // Clean up on unmount
    React.useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Reset when dialog closes
    React.useEffect(() => {
        if (!open) {
            setStatus('idle');
            setCheckoutUrl(null);
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        }
    }, [open]);

    const createCheckout = async () => {
        setStatus('creating');
        try {
            const response = await fetch('/api/chargily/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    clientName,
                    metadata: {
                        invoiceNumber,
                        userId: user?.uid || '',
                        paymentType: paymentType,
                        userEmail: user?.email || clientName,
                    }
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create payment session');
            }

            if (data.checkout_url) {
                setCheckoutUrl(data.checkout_url);
                if (onPaymentInitiated) onPaymentInitiated();
                return data.checkout_url;
            } else {
                throw new Error("No checkout URL returned");
            }

        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Payment Error",
                description: error.message,
            });
            setStatus('failed');
            return null;
        }
    };

    const openPaymentWindow = async () => {
        let url = checkoutUrl;

        if (!url) {
            url = await createCheckout();
            if (!url) return;
        }

        // Calculate popup position (center of screen)
        const width = 500;
        const height = 700;
        const left = (window.innerWidth - width) / 2 + window.screenX;
        const top = (window.innerHeight - height) / 2 + window.screenY;

        // Open popup
        popupRef.current = window.open(
            url,
            'ChargilyPayment',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (popupRef.current) {
            setStatus('pending');

            // Poll to check if popup was closed
            pollIntervalRef.current = setInterval(() => {
                if (popupRef.current?.closed) {
                    clearInterval(pollIntervalRef.current!);
                    // User closed the popup - we don't know if they paid or not
                    // The webhook will handle actual activation
                    toast({
                        title: "Payment Window Closed",
                        description: "If you completed the payment, your subscription will be activated shortly.",
                    });
                    setStatus('idle');
                }
            }, 1000);
        } else {
            // Popup blocked - fall back to redirect
            toast({
                title: "Popup Blocked",
                description: "Opening payment in a new tab instead...",
            });
            window.open(url, '_blank');
            setStatus('pending');
        }
    };

    const getTitle = () => {
        if (paymentType === 'FIRST_PURCHASE') {
            return 'Purchase License';
        } else if (paymentType === 'RENEWAL') {
            return 'Renew Service';
        }
        return 'Complete Payment';
    };

    const getDescription = () => {
        if (paymentType === 'FIRST_PURCHASE') {
            return 'Lifetime license + 1 year after-sales service';
        } else if (paymentType === 'RENEWAL') {
            return 'Renew your after-sales service for 1 year';
        }
        return 'Complete your payment';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        {getTitle()}
                    </DialogTitle>
                    <DialogDescription>
                        {getDescription()}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Amount Display */}
                    <div className="text-center p-6 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                        <p className="text-4xl font-bold text-primary">
                            {amount.toLocaleString()} <span className="text-lg">DZD</span>
                        </p>
                    </div>

                    {/* Status Messages */}
                    {status === 'pending' && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                            <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
                            <div>
                                <p className="font-medium text-yellow-800 dark:text-yellow-200">Payment in Progress</p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">Complete your payment in the popup window</p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="font-medium text-green-800 dark:text-green-200">Payment Successful!</p>
                                <p className="text-sm text-green-700 dark:text-green-300">Your subscription has been activated</p>
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="font-medium text-red-800 dark:text-red-200">Payment Failed</p>
                                <p className="text-sm text-red-700 dark:text-red-300">Please try again</p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        {(status === 'idle' || status === 'failed') && (
                            <Button
                                onClick={openPaymentWindow}
                                className="w-full gap-2"
                                size="lg"
                            >
                                <ExternalLink className="h-4 w-4" />
                                {status === 'failed' ? 'Try Again' : 'Pay with CIB / Edahabia'}
                            </Button>
                        )}

                        {status === 'creating' && (
                            <Button disabled className="w-full gap-2" size="lg">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating Payment Session...
                            </Button>
                        )}

                        {status === 'pending' && (
                            <Button
                                variant="outline"
                                onClick={openPaymentWindow}
                                className="w-full gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Reopen Payment Window
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="w-full"
                        >
                            Cancel
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Secure payment powered by Chargily Pay
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
