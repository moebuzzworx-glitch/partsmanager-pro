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

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  
  if (!serviceAccount.project_id) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing project_id');
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

/**
 * POST /api/import-products
 * Bulk imports products with server-side batching to avoid client rate limits
 * Handles both new products and updates to existing products
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

    // STEP 1: Query for existing products by reference and name
    const existingProductsMap = new Map<string, string>();
    const productsRef = db.collection('products');
    
    const references = products
      .map((p: any) => p.reference)
      .filter((r: string) => r && r.length > 0);
    
    const names = products
      .map((p: any) => p.name)
      .filter((n: string) => n && n.length > 0);

    // Batch query for existing products by reference
    if (references.length > 0) {
      const chunks = [];
      for (let i = 0; i < references.length; i += 10) {
        chunks.push(references.slice(i, i + 10));
      }
      
      for (const chunk of chunks) {
        const snapshot = await productsRef
          .where('reference', 'in', chunk)
          .where('userId', '==', userId)
          .get();
        
        snapshot.forEach((doc) => {
          const ref = doc.data().reference;
          if (ref) {
            existingProductsMap.set(`ref:${ref}`, doc.id);
          }
        });
      }
    }

    // Batch query for existing products by name
    if (names.length > 0) {
      const chunks = [];
      for (let i = 0; i < names.length; i += 10) {
        chunks.push(names.slice(i, i + 10));
      }
      
      for (const chunk of chunks) {
        const snapshot = await productsRef
          .where('name', 'in', chunk)
          .where('userId', '==', userId)
          .get();
        
        snapshot.forEach((doc) => {
          const name = doc.data().name;
          if (name) {
            existingProductsMap.set(`name:${name}`, doc.id);
          }
        });
      }
    }

    // Server-side batching (500 items per batch)
    let processedCount = 0;
    let updatedCount = 0;
    const batchSize = 500;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = db.batch();
      const chunk = products.slice(i, Math.min(i + batchSize, products.length));

      chunk.forEach((product: any) => {
        // Validate product has required fields
        if (!product.name || !product.reference) {
          return; // Skip invalid products
        }

        // Check if product already exists
        const existingIdByRef = existingProductsMap.get(`ref:${product.reference}`);
        const existingIdByName = existingProductsMap.get(`name:${product.name}`);
        const existingId = existingIdByRef || existingIdByName;

        if (existingId) {
          // Update existing product
          const docRef = productsRef.doc(existingId);
          batch.update(docRef, {
            name: product.name,
            reference: product.reference,
            brand: product.brand || null,
            stock: Number(product.stock) || 0,
            purchasePrice: Number(product.purchasePrice) || 0,
            price: Number(product.price) || 0,
            updatedAt: new Date(),
            isDeleted: false,
          });
          updatedCount++;
        } else {
          // Create new product
          const docRef = productsRef.doc();
          batch.set(docRef, {
            name: product.name,
            reference: product.reference,
            brand: product.brand || null,
            stock: Number(product.stock) || 0,
            purchasePrice: Number(product.purchasePrice) || 0,
            price: Number(product.price) || 0,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
          });
          processedCount++;
        }
      });

      await batch.commit();

      // Small delay between batches to be safe
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const totalProcessed = processedCount + updatedCount;

    return NextResponse.json(
      {
        success: true,
        processed: processedCount,
        updated: updatedCount,
        total: totalProcessed,
        message: `Successfully processed ${totalProcessed} products (${processedCount} new, ${updatedCount} updated)`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Import products error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Import failed';
    console.error('Full error:', error);
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
