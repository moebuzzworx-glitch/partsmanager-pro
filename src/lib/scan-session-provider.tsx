'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useFirebase } from '@/firebase/provider';
import { SyncService, ScanEvent } from '@/lib/sync-service';
import { useToast } from '@/hooks/use-toast';

interface ScanSessionContextType {
    sessionId: string | null;
    lastScan: ScanEvent | null;
    isPaired: boolean;
    generateSession: () => void;
}

const ScanSessionContext = createContext<ScanSessionContextType | undefined>(undefined);

export function ScanSessionProvider({ children }: { children: ReactNode }) {
    const { user, firestore } = useFirebase();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [lastScan, setLastScan] = useState<ScanEvent | null>(null);
    const { toast } = useToast();

    // Generate Session ID on mount (if Desktop)
    useEffect(() => {
        // Simple check for mobile to avoid generating sessions on phones
        if (window.innerWidth >= 768) {
            const storedSession = localStorage.getItem('stock_manager_session_id');
            if (storedSession) {
                setSessionId(storedSession);
            } else {
                const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
                setSessionId(newId);
                localStorage.setItem('stock_manager_session_id', newId);
            }
        }
    }, []);

    // Active Listener (Desktop Only)
    useEffect(() => {
        if (!sessionId || !user || !firestore) return;

        // Initialize/Keep Alive
        SyncService.initSession(firestore, sessionId, user.uid).catch(console.error);

        // Listen
        const unsubscribe = SyncService.subscribeToSession(firestore, sessionId, (scan) => {
            // Filter out old scans (older than 5 seconds from now) to avoid processing history on reload
            const scanTime = scan.timestamp?.toMillis?.() || 0;
            if (Date.now() - scanTime < 5000) {
                console.log("Global Scan Received:", scan);
                setLastScan(scan);
                toast({
                    title: "Mobile Scan Received",
                    description: `Product ID: ${scan.productId}`,
                    duration: 2000,
                });

                // Play Sound
                try {
                    const audio = new Audio('/sounds/beep.mp3'); // We need to add this file or use a data URI
                    audio.play().catch(e => console.log("Audio play failed", e));
                } catch (e) { }
            }
        });

        return () => unsubscribe();
    }, [sessionId, user, firestore, toast]);

    const generateSession = () => {
        const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
        setSessionId(newId);
        localStorage.setItem('stock_manager_session_id', newId);
    };

    return (
        <ScanSessionContext.Provider value={{ sessionId, lastScan, isPaired: !!sessionId, generateSession }}>
            {children}
        </ScanSessionContext.Provider>
    );
}

export const useScanSession = () => {
    const context = useContext(ScanSessionContext);
    if (context === undefined) {
        throw new Error('useScanSession must be used within a ScanSessionProvider');
    }
    return context;
};
