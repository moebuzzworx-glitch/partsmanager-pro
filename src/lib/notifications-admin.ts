
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    Timestamp,
    Firestore,
    writeBatch,
    doc
} from 'firebase/firestore';
import { UserSubscription, UserRole } from './types';

export type TargetAudience = 'all' | UserSubscription;

interface TargetCriteria {
    subscription?: TargetAudience;
    role?: UserRole;
}

/**
 * Send a notification to users matching specific criteria
 */
export async function sendTargetedNotifications(
    firestore: Firestore,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'alert',
    criteria: TargetCriteria,
    options?: {
        action?: { label: string; href: string };
        translations?: Record<string, { title: string; message: string }>;
    }
): Promise<{ success: boolean; count: number; error?: any }> {
    try {
        const usersRef = collection(firestore, 'users');
        const constraints: any[] = [];

        // Filter by role if specified, otherwise default to all users (usually we target 'user' role)
        if (criteria.role) {
            constraints.push(where('role', '==', criteria.role));
        }

        // If subscription is specific (not 'all'), we can try to filter by it.
        // However, if we want to target 'all', we just don't add the constraint.
        if (criteria.subscription && criteria.subscription !== 'all') {
            constraints.push(where('subscription', '==', criteria.subscription));
        }

        const q = query(usersRef, ...constraints);
        const usersSnap = await getDocs(q);

        if (usersSnap.empty) {
            return { success: true, count: 0 };
        }

        const batchSize = 400; // conservative batch size
        let batch = writeBatch(firestore);
        let operationCount = 0;
        let totalSent = 0;

        const notificationsRef = collection(firestore, 'notifications');
        const now = Timestamp.now();

        for (const userDoc of usersSnap.docs) {
            const newNotifRef = doc(notificationsRef); // Generate a new ID

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
                batch = writeBatch(firestore);
                operationCount = 0;
            }
        }

        if (operationCount > 0) {
            await batch.commit();
        }

        return { success: true, count: totalSent };

    } catch (error) {
        console.error('Error sending targeted notifications:', error);
        return { success: false, count: 0, error };
    }
}
