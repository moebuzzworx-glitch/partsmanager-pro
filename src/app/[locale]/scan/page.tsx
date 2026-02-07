'use client';

import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, ArrowLeft, Monitor, Smartphone } from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import Link from 'next/link';
import { PairingCode } from '@/components/dashboard/scan/pairing-code';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ScanPage({ params }: { params: { locale: string } }) {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const router = useRouter();
    const { user, isUserLoading } = useFirebase();
    const [baseUrl, setBaseUrl] = useState('');
    const [sessionId, setSessionId] = useState('');

    useEffect(() => {
        setBaseUrl(window.location.origin);
        // Generate a random session ID for now (or use User ID)
        // In real app, we might create a document in 'sessions' collection
        setSessionId(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7));
    }, []);

    useEffect(() => {
        // Wait for auth to be determined
        if (isUserLoading) return;
        if (!user) {
            router.push(`/${params.locale}/login`);
            return;
        }

        // Scanner initialization is handled inside the Tab content or strictly when mode is 'scan'
        // But Html5QrcodeScanner mounts on an ID, so we need to be careful with conditional rendering.
    }, [user, isUserLoading, router, params.locale]);

    // Scanner Component Wrapper to handle mounting/unmounting
    const ScannerComponent = () => {
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
                    setScanResult(decodedText);
                    try {
                        if (decodedText.includes('/scan/')) {
                            // Full URL
                            const parts = decodedText.split('/scan/');
                            const id = parts[1]; // might contain query params if pairing
                            if (decodedText.includes('?session=')) {
                                alert("Pairing not fully implemented yet, but code scanned: " + decodedText);
                                // Handle Pairing Logic Here
                            } else {
                                router.push(`/${params.locale}/scan/${id}`);
                            }
                        } else {
                            // Assume product ID
                            router.push(`/${params.locale}/scan/${decodedText}`);
                        }
                    } catch (e) {
                        console.error("Parse error", e);
                    }
                },
                (error) => {
                    // console.warn(error);
                }
            );

            return () => {
                try { scanner.clear(); } catch (e) { }
            };
        }, []);

        return <div id="reader" className="w-full h-full text-white min-h-[300px]"></div>;
    };

    if (isUserLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col items-center max-w-4xl mx-auto">
            <div className="w-full flex items-center justify-between mb-6">
                <Link href={`/${params.locale}/dashboard`}>
                    <Button variant="ghost" size="icon"><ArrowLeft /></Button>
                </Link>
                <h1 className="text-xl font-bold">Scanner</h1>
                <div className="w-10"></div>
            </div>

            <Tabs defaultValue="scan" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="scan" className="text-lg py-3">
                        <Camera className="mr-2 h-5 w-5" />
                        Scan (Mobile)
                    </TabsTrigger>
                    <TabsTrigger value="pair" className="text-lg py-3">
                        <Monitor className="mr-2 h-5 w-5" />
                        Pairing (Desktop)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="scan" className="mt-0">
                    <div className="max-w-md mx-auto">
                        <Card className="w-full mb-6">
                            <CardContent className="p-0 overflow-hidden relative min-h-[300px] bg-black">
                                <ScannerComponent />
                            </CardContent>
                        </Card>
                        <div className="text-center text-muted-foreground text-sm px-4">
                            <p>Point your camera at a product QR code.</p>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="pair" className="mt-0">
                    <div className="max-w-md mx-auto">
                        <Card>
                            <CardContent className="pt-6">
                                <PairingCode sessionId={sessionId} baseUrl={baseUrl} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
