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
 * POST /api/bulk-delete
 * Bulk deletes (moves to trash) with server-side batching
 */
export async function POST(req: NextRequest) {
  try {
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

    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { ids, collection: collectionName } = await req.json();

    if (!Array.isArray(ids) || !collectionName) {
      return NextResponse.json(
        { error: 'Missing ids or collection name' },
        { status: 400 }
      );
    }

    // Move to trash (soft delete)
    let processed = 0;
    const batchSize = 500;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = db.batch();
      const chunk = ids.slice(i, Math.min(i + batchSize, ids.length));

      chunk.forEach((id: string) => {
        const docRef = db.collection(collectionName).doc(id);
        batch.update(docRef, {
          deletedAt: new Date(),
          isDeleted: true,
        });
      });

      await batch.commit();
      processed += chunk.length;

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json(
      {
        success: true,
        processed,
        message: `Successfully moved ${processed} items to trash`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Delete failed',
      },
      { status: 500 }
    );
  }
}
