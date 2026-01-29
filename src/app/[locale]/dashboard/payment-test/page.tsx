'use client';

import React, { useState } from 'react';
import { ElectronicPaymentCard } from '@/components/payment/ElectronicPaymentCard';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentTestPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handlePay = async (mode: 'CIB' | 'EDAHABIA') => {
        setIsLoading(true);
        try {
            // Demo Data
            const demoAmount = 5000;
            const demoClient = 'Test Client';

            const response = await fetch('/api/chargily/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: demoAmount,
                    clientName: demoClient,
                    mode: mode,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Payment creation failed');
            }

            if (data.checkout_url) {
                toast({
                    title: "Redirecting to Payment",
                    description: "Please complete the payment on the secure page.",
                });
                // Redirect to Chargily
                window.location.href = data.checkout_url;
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
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>e-Payment Integration Test</CardTitle>
                    <CardDescription>
                        This page demonstrates the 3D Secure Card integration with Chargily Pay V2.
                        Select a card type to initiate a test transaction.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ElectronicPaymentCard
                        amount={5000}
                        clientName="John Doe"
                        onPay={handlePay}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            <div className="max-w-md mx-auto bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> to make this work, you must add your <code>CHARGILY_SECRET_KEY</code> to your <code>.env</code> file.
            </div>
        </div>
    );
}
