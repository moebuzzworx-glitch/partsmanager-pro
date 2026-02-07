import { collection, addDoc, doc, setDoc, onSnapshot, serverTimestamp, query, orderBy, Firestore } from 'firebase/firestore';

export interface ScanEvent {
    id?: string;
    productId: string;
    timestamp: any;
    scannedBy?: string;
    productName?: string;
}

export const SyncService = {
    // Desktop: Initialize a session
    initSession: async (firestore: Firestore, sessionId: string, userId: string) => {
        const sessionRef = doc(firestore, 'sync_sessions', sessionId);
        await setDoc(sessionRef, {
            createdAt: serverTimestamp(),
            hostId: userId,
            status: 'active'
        });
        return sessionId;
    },

    // Mobile: Send a scan event
    sendScan: async (firestore: Firestore, sessionId: string, productId: string, userId?: string) => {
        const scansRef = collection(firestore, 'sync_sessions', sessionId, 'scans');
        await addDoc(scansRef, {
            productId,
            timestamp: serverTimestamp(),
            scannedBy: userId || 'anonymous'
        });
    },

    // Desktop: Listen for new scans
    subscribeToSession: (firestore: Firestore, sessionId: string, onScan: (scan: ScanEvent) => void) => {
        const scansRef = collection(firestore, 'sync_sessions', sessionId, 'scans');
        const q = query(scansRef, orderBy('timestamp', 'asc'));

        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    onScan({ id: change.doc.id, ...data } as ScanEvent);
                }
            });
        });
    }
};
