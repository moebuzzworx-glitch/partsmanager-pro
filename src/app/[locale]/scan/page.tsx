'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import Link from 'next/link';
import { PairingCode } from '@/components/dashboard/scan/pairing-code';
import { SyncService } from '@/lib/sync-service';

// Scanner Component defined outside to prevent re-renders
const ScannerComponent = ({ onScan }: { onScan: (decodedText: string) => void }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                scanner.clear();
                onScan(decodedText);
            },
            (error) => {
                // console.warn(error);
            }
        );

        return () => {
            try { scanner.clear(); } catch (e) { }
        };
    }, [onScan]);

    return <div id="reader" className="w-full h-full text-white min-h-[300px]"></div>;
};

export default function ScanPage() {
    // We use useParams() for safe access to locale in Client Components
    const params = useParams();
    const locale = params?.locale as string || 'en'; // Fallback to 'en'

    const router = useRouter();
    const { user, isUserLoading, firestore } = useFirebase();
    const [baseUrl, setBaseUrl] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [pairedSessionId, setPairedSessionId] = useState<string | null>(null);

    // Initialize Session (Desktop)
    useEffect(() => {
        setBaseUrl(window.location.origin);
        const newSessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
        setSessionId(newSessionId);

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Create Session in Firestore (Desktop Only)
    useEffect(() => {
        if (!isMobile && firestore && user && sessionId) {
            SyncService.initSession(firestore, sessionId, user.uid).catch(console.error);

            // Listen for scans
            const unsubscribe = SyncService.subscribeToSession(firestore, sessionId, (scan) => {
                // Ignore scans older than session start? For now just log.
                console.log("Desktop received scan:", scan);
                // In real app: Add to Invoice Line Items
                // For now, simple alert to prove it works
                // Note: 'added' event fires for existing docs too, so we might get old ones on refresh.
                // A timestamp check would be good here.
                if (Date.now() - (scan.timestamp?.toMillis?.() || 0) < 5000) {
                    alert(`New Scan Received!\nProduct: ${scan.productId}`);
                }
            });

            return () => unsubscribe();
        }
    }, [isMobile, firestore, user, sessionId]);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) {
            router.push(`/${locale}/login`);
        }
    }, [user, isUserLoading, router, locale]);

    const handleScan = async (decodedText: string) => {
        console.log("Scanned:", decodedText);

        try {
            // 1. Check for Pairing Code
            if (decodedText.includes('session=')) {
                const urlParams = new URLSearchParams(decodedText.split('?')[1]);
                const sid = urlParams.get('session');
                if (sid) {
                    setPairedSessionId(sid);
                    alert("Success! Paired with Desktop.");
                }
                return;
            }

            // 2. Extract Product ID
            let targetId = decodedText;
            if (decodedText.includes('/scan/')) {
                const parts = decodedText.split('/scan/');
                if (parts.length > 1) {
                    targetId = parts[1].split('?')[0].split('/')[0];
                }
            }

            // 3. If Paired -> Send to Desktop
            if (pairedSessionId && firestore) {
                await SyncService.sendScan(firestore, pairedSessionId, targetId, user?.uid);
                // Keep scanner open, show tiny toast/feedback
                // For now, just a log/alert
                // toast({ title: "Sent to Desktop", description: targetId });
                console.log("Sent to desktop:", targetId);
                return;
            }

            // 4. Default -> Navigate to Product Page
            const targetPath = `/${locale}/scan/${targetId}`;
            router.push(targetPath);

        } catch (e) {
            console.error("Parse error", e);
            alert("Error: " + e);
        }
    };

    if (isUserLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col items-center max-w-4xl mx-auto">
            <div className="w-full flex items-center justify-between mb-6">
                <Link href={`/${locale}/dashboard`}>
                    <Button variant="ghost" size="icon"><ArrowLeft /></Button>
                </Link>
                <div className="text-center">
                    <h1 className="text-xl font-bold">{isMobile ? 'Mobile Scanner' : 'Desktop Pairing'}</h1>
                    {isMobile && pairedSessionId && (
                        <span className="text-xs text-green-600 font-mono bg-green-100 px-2 py-0.5 rounded-full">
                            ● Paired
                        </span>
                    )}
                </div>
                <div className="w-10"></div>
            </div>

            {isMobile ? (
                <div className="max-w-md mx-auto w-full">
                    <Card className="w-full mb-6">
                        <CardContent className="p-0 overflow-hidden relative min-h-[300px] bg-black">
                            <ScannerComponent onScan={handleScan} />
                        </CardContent>
                    </Card>
                    <div className="text-center text-muted-foreground text-sm px-4">
                        <p>{pairedSessionId ? "Scanning sends to Desktop..." : "Point at Product or Pairing Code."}</p>
                        {pairedSessionId && (
                            <Button variant="link" size="sm" onClick={() => setPairedSessionId(null)} className="text-red-500 h-auto p-0 mt-2">
                                Unpair
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="max-w-md mx-auto w-full">
                    <Card>
                        <CardContent className="pt-6">
                            <PairingCode sessionId={sessionId} baseUrl={baseUrl} />
                        </CardContent>
                    </Card>
                    <div className="text-center text-muted-foreground text-sm px-4 mt-8">
                        <p>Scan this QR code with the mobile app to pair your device.</p>
                        <p className="text-xs mt-2 font-mono text-muted-foreground/50">Session: {sessionId.slice(0, 8)}...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
