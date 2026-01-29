import { NextRequest, NextResponse } from 'next/server';
import { createChargilyCheckout } from '@/lib/chargily';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { amount, clientName, mode, metadata } = body;

        // Validate input
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Construct Callback URLs (Dynamic based on current host)
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';

        // Redirect to settings page after payment (subscription-related)
        const successUrl = `${protocol}://${host}/dashboard/settings?payment=success&type=${metadata?.paymentType || 'unknown'}`;
        const failureUrl = `${protocol}://${host}/dashboard/settings?payment=failed`;

        // Webhook URL for automatic activation
        const webhookUrl = `${protocol}://${host}/api/chargily/webhook`;

        const checkoutSession = await createChargilyCheckout({
            amount: amount,
            currency: 'dzd',
            success_url: successUrl,
            failure_url: failureUrl,
            webhook_url: webhookUrl,
            mode: mode,
            client_name: clientName,
            metadata: metadata, // Pass metadata for webhook processing
        });

        return NextResponse.json({ checkout_url: checkoutSession.checkout_url });
    } catch (error: any) {
        console.error('Checkout API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
