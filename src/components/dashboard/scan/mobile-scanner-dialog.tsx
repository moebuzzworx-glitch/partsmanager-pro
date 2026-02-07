'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X, Check, Camera } from 'lucide-react';

interface CameraDevice {
    id: string;
    label: string;
}

// Smart camera selection for QR scanning
function selectBestCamera(cameras: CameraDevice[]): CameraDevice | null {
    if (cameras.length === 0) return null;
    if (cameras.length === 1) return cameras[0];

    const priorityKeywords = ['main', 'wide', 'back', 'rear'];
    const avoidKeywords = ['ultra', 'tele', 'macro', 'depth', 'zoom'];

    const scored = cameras.map(cam => {
        const label = cam.label.toLowerCase();
        let score = 0;
        priorityKeywords.forEach(kw => { if (label.includes(kw)) score += 10; });
        avoidKeywords.forEach(kw => { if (label.includes(kw)) score -= 15; });
        if (label.includes('0')) score += 5;
        if (cameras.indexOf(cam) === 0) score += 3;
        return { cam, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].cam;
}

interface MobileScannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (productId: string) => void;
    title?: string;
}

export function MobileScannerDialog({ open, onOpenChange, onScan, title = "Scan Product" }: MobileScannerDialogProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<string>('');
    const lastScanTimeRef = useRef<number>(0);

    const [isStarted, setIsStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [scanCount, setScanCount] = useState(0);

    const handleScanResult = useCallback((decodedText: string) => {
        // Debounce same code for 3 seconds
        const now = Date.now();
        if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) {
            return;
        }
        lastScanRef.current = decodedText;
        lastScanTimeRef.current = now;

        // Extract product ID from URL if needed
        let productId = decodedText;
        if (decodedText.includes('/scan/')) {
            const parts = decodedText.split('/scan/');
            if (parts.length > 1) {
                productId = parts[1].split('?')[0].split('/')[0];
            }
        }

        // Skip pairing codes
        if (decodedText.includes('session=')) {
            return;
        }

        // Vibrate
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        // Update UI and call callback
        setLastScanned(productId);
        setScanCount(prev => prev + 1);
        onScan(productId);

        // Clear feedback after 2 seconds
        setTimeout(() => setLastScanned(null), 2000);
    }, [onScan]);

    // Start/stop scanner based on dialog open state
    useEffect(() => {
        if (!open) {
            // Cleanup when closed
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(() => { });
            }
            setIsStarted(false);
            setIsLoading(false);
            setScanCount(0);
            return;
        }

        // Start scanner when dialog opens
        setIsLoading(true);

        const startScanner = async () => {
            try {
                const deviceList = await Html5Qrcode.getCameras();

                // Filter to back cameras
                const backCameras = deviceList.filter((cam) => {
                    const label = cam.label.toLowerCase();
                    return !label.includes('front') && !label.includes('user') && !label.includes('selfie');
                });

                const camerasToUse = backCameras.length > 0 ? backCameras : deviceList;
                const bestCamera = selectBestCamera(camerasToUse);

                if (!bestCamera) {
                    console.error("No camera found");
                    setIsLoading(false);
                    return;
                }

                const html5Qrcode = new Html5Qrcode("mobile-scanner-reader");
                scannerRef.current = html5Qrcode;

                await html5Qrcode.start(
                    bestCamera.id,
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    handleScanResult,
                    () => { }
                );

                setIsStarted(true);
                setIsLoading(false);
            } catch (err) {
                console.error("Failed to start scanner:", err);
                setIsLoading(false);
            }
        };

        // Small delay to let dialog render
        const timer = setTimeout(startScanner, 300);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, [open, handleScanResult]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        {title}
                        {scanCount > 0 && (
                            <span className="text-xs font-normal bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                {scanCount} scanned
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Point your camera at a product barcode or QR code
                    </DialogDescription>
                </DialogHeader>

                <div className="relative w-full min-h-[300px] bg-black">
                    <div id="mobile-scanner-reader" className="w-full"></div>

                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                    )}

                    {/* Scan success feedback */}
                    {lastScanned && (
                        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white p-3 animate-in slide-in-from-bottom duration-200">
                            <div className="flex items-center justify-center gap-2">
                                <Check className="h-5 w-5" />
                                <span className="font-medium">Added: {lastScanned.slice(0, 25)}{lastScanned.length > 25 ? '...' : ''}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 pt-2 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                        {isStarted ? 'Scanner active. Keep scanning!' : 'Starting camera...'}
                    </span>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
