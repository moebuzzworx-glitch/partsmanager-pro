import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Initialize Firebase Admin (server-side)
function getFirebaseAdmin() {
    if (getApps().length === 0) {
        // For production, use service account credentials
        // For now, we'll use the project ID from env
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

        if (privateKeyRaw) {
            // Handle various key formats to avoid Netlify/Env issues
            let privateKey = privateKeyRaw.replace(/\\n/g, '\n'); // Handle literal \n

            // If the user pasted JUST the base64 string (to save space/avoid errors), add headers back
            if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
            }

            initializeApp({
                credential: cert({
                    projectId: projectId,
                    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
        } else {
            // Fallback for development - uses default credentials
            initializeApp({ projectId });
        }
    }
    return getFirestore();
}

// Verify Chargily webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
        const computedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload, 'utf8')
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(computedSignature)
        );
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

// Activate user subscription
async function activateSubscription(
    db: FirebaseFirestore.Firestore,
    userId: string,
    paymentType: 'FIRST_PURCHASE' | 'RENEWAL'
) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
    }

    const userData = userDoc.data();
    const now = new Date();
    let newExpiryDate: Date;

    if (paymentType === 'FIRST_PURCHASE') {
        // First purchase: set to premium with 1 year service
        newExpiryDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
        // Renewal: extend from current expiry or from now
        const currentExpiry = userData?.premiumExpiryDate?.toDate?.() || now;
        const baseDate = currentExpiry > now ? currentExpiry : now;
        newExpiryDate = new Date(baseDate.getFullYear() + 1, baseDate.getMonth(), baseDate.getDate());
    }

    await userRef.update({
        subscription: 'premium',
        premiumExpiryDate: Timestamp.fromDate(newExpiryDate),
        lastPaymentDate: Timestamp.fromDate(now),
        lastPaymentType: paymentType,
        updatedAt: Timestamp.fromDate(now),
    });

    console.log(`✅ Subscription activated for user ${userId}. Expires: ${newExpiryDate.toISOString()}`);
    return { success: true, expiryDate: newExpiryDate };
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('signature') || '';
        const chargilySecret = process.env.CHARGILY_SECRET_KEY || '';

        // Log for debugging (remove in production)
        console.log('📩 Webhook received');
        console.log('Signature header:', signature ? 'Present' : 'Missing');

        // Verify signature (skip in test mode for easier debugging)
        const isTestMode = chargilySecret.startsWith('test_');
        if (!isTestMode && signature) {
            const isValid = verifyWebhookSignature(rawBody, signature, chargilySecret);
            if (!isValid) {
                console.error('❌ Invalid webhook signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        // Parse the webhook payload
        const payload = JSON.parse(rawBody);
        console.log('Webhook payload type:', payload.type);
        console.log('Webhook data:', JSON.stringify(payload.data, null, 2));

        // Handle checkout events
        // Chargily sends: checkout.paid, checkout.failed, etc.
        if (payload.type === 'checkout.paid' || payload.data?.status === 'paid') {
            const checkoutData = payload.data;
            const metadata = checkoutData?.metadata || {};

            // Extract user info from metadata or invoice number
            // We encoded: invoiceNumber = "FIRST_PURCHASE-{userId}-{timestamp}" or "RENEWAL-{userId}-{timestamp}"
            const invoiceNumber = metadata.invoiceNumber || checkoutData?.invoice_number || '';
            const parts = invoiceNumber.split('-');

            let paymentType: 'FIRST_PURCHASE' | 'RENEWAL' = 'FIRST_PURCHASE';
            let userId = '';

            if (parts[0] === 'FIRST_PURCHASE' || parts[0] === 'RENEWAL') {
                paymentType = parts[0] as 'FIRST_PURCHASE' | 'RENEWAL';
                userId = parts[1] || '';
            }

            // Also check metadata directly
            if (metadata.userId) {
                userId = metadata.userId;
            }
            if (metadata.paymentType) {
                paymentType = metadata.paymentType;
            }

            if (!userId) {
                console.error('❌ No userId found in webhook payload');
                // Still return 200 to acknowledge receipt
                return NextResponse.json({
                    received: true,
                    warning: 'No userId found, subscription not activated'
                });
            }

            // Activate the subscription
            const db = getFirebaseAdmin();
            const result = await activateSubscription(db, userId, paymentType);

            console.log(`✅ Payment processed successfully for user ${userId}`);
            return NextResponse.json({
                received: true,
                activated: true,
                userId,
                paymentType,
                expiryDate: result.expiryDate.toISOString()
            });
        }

        // Handle failed payments
        if (payload.type === 'checkout.failed' || payload.data?.status === 'failed') {
            console.log('⚠️ Payment failed:', payload.data?.failure_reason || 'Unknown reason');
            return NextResponse.json({ received: true, status: 'payment_failed' });
        }

        // Acknowledge other events
        return NextResponse.json({ received: true, status: 'event_acknowledged' });

    } catch (error: any) {
        console.error('❌ Webhook error:', error);
        // Always return 200 to prevent Chargily from retrying
        return NextResponse.json({
            received: true,
            error: error.message
        }, { status: 200 });
    }
}

// Handle GET requests (for webhook verification/testing)
export async function GET() {
    return NextResponse.json({
        status: 'Chargily webhook endpoint active',
        timestamp: new Date().toISOString()
    });
}
