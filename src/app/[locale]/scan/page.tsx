'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { useFirebase } from '@/firebase';
import Link from 'next/link';
import { PairingCode } from '@/components/dashboard/scan/pairing-code';
import { SyncService } from '@/lib/sync-service';

// Camera info type from html5-qrcode
interface CameraDevice {
    id: string;
    label: string;
}

// Smart camera selection: pick the best camera for barcode scanning
function selectBestCamera(cameras: CameraDevice[]): CameraDevice | null {
    if (cameras.length === 0) return null;
    if (cameras.length === 1) return cameras[0];

    // Priority order for barcode scanning (main camera is usually best)
    const priorityKeywords = ['main', 'wide', 'back', 'rear'];
    const avoidKeywords = ['ultra', 'tele', 'macro', 'depth', 'zoom'];

    // Score each camera
    const scored = cameras.map(cam => {
        const label = cam.label.toLowerCase();
        let score = 0;

        // Boost for priority keywords
        priorityKeywords.forEach(kw => {
            if (label.includes(kw)) score += 10;
        });

        // Penalize keywords that indicate specialized cameras
        avoidKeywords.forEach(kw => {
            if (label.includes(kw)) score -= 15;
        });

        // Cameras with "0" in label are often the main camera
        if (label.includes('0') || label.includes('camera 0')) score += 5;

        // First camera in list is often the main one
        if (cameras.indexOf(cam) === 0) score += 3;

        return { cam, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    console.log("Camera selection scores:", scored.map(s => `${s.cam.label}: ${s.score}`));

    return scored[0].cam;
}

// Scanner Component with smart camera auto-selection
const ScannerComponent = ({ onScan }: { onScan: (decodedText: string) => void }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isTransitioningRef = useRef<boolean>(false);
    const lastScanRef = useRef<string>('');
    const lastScanTimeRef = useRef<number>(0);
    const onScanRef = useRef(onScan); // Stable ref for callback

    const [isStarted, setIsStarted] = useState(false);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Keep onScanRef up to date without triggering re-renders
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    // Enumerate cameras on mount and auto-select best one
    useEffect(() => {
        Html5Qrcode.getCameras().then((deviceList) => {
            const backCameras = deviceList.filter((cam) => {
                const label = cam.label.toLowerCase();
                return !label.includes('front') && !label.includes('user') && !label.includes('selfie');
            });

            const camerasToUse = backCameras.length > 0 ? backCameras : deviceList;

            const bestCamera = selectBestCamera(camerasToUse);
            if (bestCamera) {
                console.log("Selected camera:", bestCamera.label);
                setSelectedCameraId(bestCamera.id);
            }
            setIsLoading(false);
        }).catch((err) => {
            console.error("Failed to get cameras:", err);
            setIsLoading(false);
        });
    }, []);

    // Start scanner when camera is selected - NO onScan dependency
    useEffect(() => {
        if (!selectedCameraId) return;
        if (isTransitioningRef.current) return;

        let isMounted = true;

        const startScanner = async () => {
            if (isTransitioningRef.current) return;

            try {
                isTransitioningRef.current = true;

                if (scannerRef.current?.isScanning) {
                    await scannerRef.current.stop().catch(() => { });
                }

                const html5Qrcode = scannerRef.current || new Html5Qrcode("reader");
                scannerRef.current = html5Qrcode;

                await html5Qrcode.start(
                    selectedCameraId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        const now = Date.now();
                        if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) {
                            return;
                        }
                        lastScanRef.current = decodedText;
                        lastScanTimeRef.current = now;

                        if (navigator.vibrate) {
                            navigator.vibrate(100);
                        }
                        // Use ref to call callback - prevents re-render dependency
                        onScanRef.current(decodedText);
                    },
                    () => { }
                );

                if (isMounted) {
                    setIsStarted(true);
                }
            } catch (err) {
                console.error("Failed to start scanner:", err);
            } finally {
                isTransitioningRef.current = false;
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            const scanner = scannerRef.current;
            if (scanner && !isTransitioningRef.current) {
                if (scanner.isScanning) {
                    isTransitioningRef.current = true;
                    scanner.stop().catch(() => { }).finally(() => {
                        isTransitioningRef.current = false;
                    });
                }
            }
        };
    }, [selectedCameraId]); // Removed onScan - using ref instead

    return (
        <div className="relative w-full min-h-[300px]">
            <div id="reader" className="w-full"></div>

            {/* Loading State */}
            {(isLoading || !isStarted) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}
        </div>
    );
};

const PAIRED_SESSION_STORAGE_KEY = 'stock_manager_paired_session_id';

export default function ScanPage() {
    const params = useParams();
    const locale = params?.locale as string || 'en';

    const router = useRouter();
    const { user, isUserLoading, firestore } = useFirebase();
    const [baseUrl, setBaseUrl] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [pairedSessionId, setPairedSessionId] = useState<string | null>(null);
    const [showPairSuccess, setShowPairSuccess] = useState(false);
    const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);
    const [scanCount, setScanCount] = useState(0);

    // Initialize Session and check for stored pairing
    useEffect(() => {
        setBaseUrl(window.location.origin);
        const newSessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
        setSessionId(newSessionId);

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // RESTORE PAIRING FROM LOCALSTORAGE (Mobile only)
        if (window.innerWidth < 768) {
            const storedPairedSession = localStorage.getItem(PAIRED_SESSION_STORAGE_KEY);
            if (storedPairedSession) {
                setPairedSessionId(storedPairedSession);
            }
        }

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Create Session in Firestore (Desktop Only)
    useEffect(() => {
        if (!isMobile && firestore && user && sessionId) {
            SyncService.initSession(firestore, sessionId, user.uid).catch(console.error);

            const unsubscribe = SyncService.subscribeToSession(firestore, sessionId, (scan) => {
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
                    // PERSIST TO LOCALSTORAGE
                    localStorage.setItem(PAIRED_SESSION_STORAGE_KEY, sid);
                    setShowPairSuccess(true);
                    setTimeout(() => setShowPairSuccess(false), 2000);
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

            // 3. If Paired -> Send to Desktop (KEEP SCANNING)
            if (pairedSessionId && firestore) {
                await SyncService.sendScan(firestore, pairedSessionId, targetId, user?.uid);
                setLastScannedProduct(targetId);
                setScanCount(prev => prev + 1);
                // Clear the feedback after 2 seconds
                setTimeout(() => setLastScannedProduct(null), 2000);
                return;
            }

            // 4. Default -> Navigate to Product Page
            const targetPath = `/${locale}/scan/${targetId}`;
            router.push(targetPath);

        } catch (e) {
            console.error("Parse error", e);
        }
    };

    const handleUnpair = () => {
        setPairedSessionId(null);
        localStorage.removeItem(PAIRED_SESSION_STORAGE_KEY);
        setLastScannedProduct(null);
        setScanCount(0);
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
                            ● Paired {scanCount > 0 && `(${scanCount} scanned)`}
                        </span>
                    )}
                </div>
                <div className="w-10"></div>
            </div>

            {isMobile ? (
                <div className="max-w-md mx-auto w-full">
                    {/* Success Animation for Pairing */}
                    {showPairSuccess ? (
                        <Card className="w-full mb-6">
                            <CardContent className="p-0 min-h-[300px] flex flex-col items-center justify-center bg-green-50">
                                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                                    <Check className="h-10 w-10 text-green-600" />
                                </div>
                                <p className="text-xl font-bold text-green-600">Paired!</p>
                                <p className="text-sm text-green-600/70">Starting scanner...</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="w-full mb-6">
                            <CardContent className="p-0 overflow-hidden relative min-h-[300px] bg-black">
                                <ScannerComponent onScan={handleScan} />
                                {/* Scan Feedback Overlay */}
                                {lastScannedProduct && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white p-3 animate-in slide-in-from-bottom duration-200">
                                        <div className="flex items-center justify-center gap-2">
                                            <Check className="h-5 w-5" />
                                            <span className="font-medium">Sent: {lastScannedProduct.slice(0, 20)}...</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="text-center text-muted-foreground text-sm px-4">
                        <p>{pairedSessionId ? "Scanning sends to Desktop. Keep scanning!" : "Point at Product or Pairing Code."}</p>
                        {pairedSessionId && (
                            <Button variant="link" size="sm" onClick={handleUnpair} className="text-red-500 h-auto p-0 mt-2">
                                Unpair & Reset
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

