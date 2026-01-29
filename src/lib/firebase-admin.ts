import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getFirebaseAdmin() {
    if (getApps().length === 0) {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
            initializeApp({
                credential: cert({
                    projectId: projectId,
                    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
        } else {
            initializeApp({ projectId });
        }
    }
    return getFirestore();
}
