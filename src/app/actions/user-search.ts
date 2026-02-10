'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';

export interface UserSearchResult {
    uid: string;
    email: string;
    displayName: string;
}

export async function searchUsersAction(term: string): Promise<UserSearchResult[]> {
    if (!term || term.length < 2) return [];

    try {
        const db = getFirebaseAdmin();
        const usersRef = db.collection('users');

        // Firestore doesn't support partial string match easily.
        // We'll search by email prefix since that's most common for admins.
        // OR fetch a batch and filter in memory if the user count is small.
        // Assuming user count is < 1000, fetching all and filtering might be acceptable for admin dashboards.
        // But let's try prefix search on email first.

        // Prefix search: where('email', '>=', term) AND where('email', '<=', term + '\uf8ff')
        const qSnapshot = await usersRef
            .where('email', '>=', term)
            .where('email', '<=', term + '\uf8ff')
            .limit(10)
            .get();

        const results: UserSearchResult[] = [];
        qSnapshot.forEach(doc => {
            const data = doc.data();
            results.push({
                uid: doc.id,
                email: data.email || '',
                displayName: data.displayName || data.email || 'Unknown',
            });
        });

        // Also try searching name if email yielded few results?
        // For now, email search is robust.

        return results;
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
}
