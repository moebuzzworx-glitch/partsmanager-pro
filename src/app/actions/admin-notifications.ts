'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { UserSubscription, UserRole } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export type TargetAudience = 'all' | UserSubscription;

interface TargetCriteria {
    subscription?: TargetAudience;
    role?: UserRole;
    specificUserIds?: string[];
}

export async function sendTargetedNotificationsAction(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'alert',
    criteria: TargetCriteria,
    options?: {
        action?: { label: string; href: string };
        translations?: Record<string, { title: string; message: string }>;
        pin?: { durationHours?: number }; // If undefined, permanent pin
    }
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const db = getFirebaseAdmin();
        const usersRef = db.collection('users');

        let userDocs: FirebaseFirestore.DocumentData[] = [];

        // Check for specific users first
        if (criteria.specificUserIds && criteria.specificUserIds.length > 0) {
            // Fetch these users specifically
            // We can use getAll but we need doc refs
            const refs = criteria.specificUserIds.map(id => usersRef.doc(id));
            const snapshots = await db.getAll(...refs);
            // Filter out non-existent
            userDocs = snapshots.filter(snap => snap.exists);
        } else {
            // Use existing filter logic
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
            userDocs = usersSnap.docs;
        }

        if (userDocs.length === 0) {
            return { success: true, count: 0 };
        }

        const batchSize = 400;
        let batch = db.batch();
        let operationCount = 0;
        let totalSent = 0;

        const notificationsRef = db.collection('notifications');
        const now = FieldValue.serverTimestamp(); // Use server timestamp

        // Calculate pin expiration if provided
        let pinExpiresAt: Date | null = null;
        const isPinned = !!options?.pin;

        if (isPinned && options!.pin!.durationHours) {
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + options!.pin!.durationHours!);
            pinExpiresAt = expiryDate;
        }

        for (const userDoc of userDocs) {
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
                pinned: isPinned,
                pinExpiresAt: pinExpiresAt, // Can be null if permanent
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
