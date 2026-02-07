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

    const [scanResult, setScanResult] = useState<string | null>(null);
    const router = useRouter();
    const { user, isUserLoading } = useFirebase();
    const [baseUrl, setBaseUrl] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setBaseUrl(window.location.origin);
        setSessionId(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7));

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) {
            router.push(`/${locale}/login`);
        }
    }, [user, isUserLoading, router, locale]);

    const handleScan = (decodedText: string) => {
        setScanResult(decodedText);
        console.log("Scanned:", decodedText);

        try {
            let targetId = decodedText;

            // Handle URL format: http://.../scan/ID
            if (decodedText.includes('/scan/')) {
                const parts = decodedText.split('/scan/');
                if (parts.length > 1) {
                    targetId = parts[1];
                    // Remove any query params or trailing slashes
                    targetId = targetId.split('?')[0].split('/')[0];
                }
            }

            // Handle Pairing Code
            if (decodedText.includes('session=')) {
                alert("Pairing not fully implemented yet. Code: " + decodedText);
                return;
            }

            // Navigate to Product Page
            const targetPath = `/${locale}/scan/${targetId}`;
            console.log("Navigating to:", targetPath);
            router.push(targetPath);

        } catch (e) {
            console.error("Parse error", e);
            alert("Error parsing QR Code");
        }
    };

    if (isUserLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col items-center max-w-4xl mx-auto">
            <div className="w-full flex items-center justify-between mb-6">
                <Link href={`/${locale}/dashboard`}>
                    <Button variant="ghost" size="icon"><ArrowLeft /></Button>
                </Link>
                <h1 className="text-xl font-bold">{isMobile ? 'Mobile Scanner' : 'Desktop Pairing'}</h1>
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
                        <p>Point your camera at a product QR code.</p>
                        <p className="text-xs mt-2 text-muted-foreground/50">Debug: {locale}</p>
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
                    </div>
                </div>
            )}
        </div>
    );
}
