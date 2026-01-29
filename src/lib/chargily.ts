const CHARGILY_API_URL = process.env.CHARGILY_API_URL || 'https://pay.chargily.net/test/api/v2';
const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;

export interface CheckoutParams {
    amount: number;
    currency: 'dzd';
    success_url: string;
    failure_url?: string;
    webhook_url?: string;
    mode?: 'CIB' | 'EDAHABIA';
    client_name?: string;
    metadata?: {
        invoiceNumber?: string;
        userId?: string;
        paymentType?: 'FIRST_PURCHASE' | 'RENEWAL';
        [key: string]: any;
    };
}

export async function createChargilyCheckout(params: CheckoutParams) {
    if (!CHARGILY_SECRET_KEY) {
        throw new Error('CHARGILY_SECRET_KEY is not defined in environment variables');
    }

    // Merge metadata
    const metadata = {
        client_name: params.client_name,
        payment_mode: params.mode,
        ...params.metadata,
    };

    const requestBody: Record<string, any> = {
        amount: params.amount,
        currency: params.currency,
        success_url: params.success_url,
        failure_url: params.failure_url || params.success_url,
        metadata: metadata,
    };

    // Add webhook URL if provided
    if (params.webhook_url) {
        requestBody.webhook_endpoint = params.webhook_url;
    }

    console.log('Creating Chargily checkout with:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${CHARGILY_API_URL}/checkouts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CHARGILY_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Chargily API Error:', errorText);
        throw new Error(`Failed to create checkout: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Chargily checkout created:', data.checkout_url);
    return data;
}
