import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK (only once)
function getAdminApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
  );

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

/**
 * POST /api/import-products
 * Bulk imports products with server-side batching to avoid client rate limits
 */
export async function POST(req: NextRequest) {
  try {
    // Get authorization token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const admin = getAdminApp();
    const auth = getAuth(admin);
    const db = getFirestore(admin);

    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { products } = await req.json();

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    // Server-side batching (500 items per batch)
    let processed = 0;
    const batchSize = 500;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = db.batch();
      const chunk = products.slice(i, Math.min(i + batchSize, products.length));

      chunk.forEach((product: any) => {
        const docRef = db.collection('products').doc();
        batch.set(docRef, {
          ...product,
          userId, // Enforce user isolation
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      await batch.commit();
      processed += chunk.length;

      // Small delay between batches to be safe
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json(
      {
        success: true,
        processed,
        message: `Successfully imported ${processed} products`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Import products error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Import failed',
      },
      { status: 500 }
    );
  }
}
