'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { UserSubscription, UserRole } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export type TargetAudience = 'all' | UserSubscription;

interface TargetCriteria {
    subscription?: TargetAudience;
    role?: UserRole;
}

export async function sendTargetedNotificationsAction(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'alert',
    criteria: TargetCriteria,
    options?: {
        action?: { label: string; href: string };
        translations?: Record<string, { title: string; message: string }>;
    }
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const db = getFirebaseAdmin();
        const usersRef = db.collection('users');

        let query: FirebaseFirestore.Query = usersRef;

        // Filter by role if specified
        if (criteria.role) {
            query = query.where('role', '==', criteria.role);
        }

        // Filter by subscription
        if (criteria.subscription && criteria.subscription !== 'all') {
            query = query.where('subscription', '==', criteria.subscription);
        }

        const usersSnap = await query.get();

        if (usersSnap.empty) {
            return { success: true, count: 0 };
        }

        const batchSize = 400;
        let batch = db.batch();
        let operationCount = 0;
        let totalSent = 0;

        const notificationsRef = db.collection('notifications');
        const now = FieldValue.serverTimestamp(); // Use server timestamp

        for (const userDoc of usersSnap.docs) {
            const newNotifRef = notificationsRef.doc();

            batch.set(newNotifRef, {
                userId: userDoc.id,
                title,
                message,
                type,
                read: false,
                createdAt: now,
                action: options?.action || null,
                translations: options?.translations || null,
            });

            operationCount++;
            totalSent++;

            if (operationCount >= batchSize) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        }

        if (operationCount > 0) {
            await batch.commit();
        }

        console.log(`[Admin Action] Sent ${totalSent} notifications`);
        return { success: true, count: totalSent };

    } catch (error: any) {
        console.error('Error sending targeted notifications (Server Action):', error);
        return { success: false, count: 0, error: error.message || 'Unknown error' };
    }
}
