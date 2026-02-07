import { db } from '@/firebase/firebase'; // Adjust import path
import { collection, addDoc, doc, updateDoc, onSnapshot, serverTimestamp, query, orderBy, setDoc } from 'firebase/firestore';

export interface ScanEvent {
    id?: string;
    productId: string;
    timestamp: any;
    scannedBy?: string;
    productName?: string; // Optional optimization
}

export const SyncService = {
    // Desktop: Initialize a session
    initSession: async (sessionId: string, userId: string) => {
        const sessionRef = doc(db, 'sync_sessions', sessionId);
        await setDoc(sessionRef, {
            createdAt: serverTimestamp(),
            hostId: userId,
            status: 'active'
        });
        return sessionId;
    },

    // Mobile: Send a scan event
    sendScan: async (sessionId: string, productId: string, userId?: string) => {
        const scansRef = collection(db, 'sync_sessions', sessionId, 'scans');
        await addDoc(scansRef, {
            productId,
            timestamp: serverTimestamp(),
            scannedBy: userId || 'anonymous'
        });
    },

    // Desktop: Listen for new scans
    subscribeToSession: (sessionId: string, onScan: (scan: ScanEvent) => void) => {
        const scansRef = collection(db, 'sync_sessions', sessionId, 'scans');
        const q = query(scansRef, orderBy('timestamp', 'asc')); // or desc depending on need

        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    // Only process recent scans (optional check needed to avoid re-processing old ones on reload?)
                    // Usually Firestore 'added' fires for all existing docs first. 
                    // We might need a client-side filter or 'since' timestamp.
                    onScan({ id: change.doc.id, ...data } as ScanEvent);
                }
            });
        });
    }
};
