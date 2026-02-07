'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Check, Smartphone, Camera } from 'lucide-react';
import { useScanSession } from '@/lib/scan-session-provider';
import { PairingCode } from './pairing-code';
import { MobileScannerDialog } from './mobile-scanner-dialog';

interface ScannerPairingDialogProps {
    dictionary?: any;
    onScan?: (productId: string) => void; // Required for mobile mode
}

export function ScannerPairingDialog({ dictionary, onScan }: ScannerPairingDialogProps) {
    const { sessionId, lastScan } = useScanSession();
    const [open, setOpen] = useState(false);
    const [justPaired, setJustPaired] = useState(false);
    const [pairTimestamp, setPairTimestamp] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile on mount
    useEffect(() => {
        setIsMobile(window.innerWidth < 768);

        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Track when dialog opens to detect new scans (desktop pairing mode)
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setPairTimestamp(Date.now());
            setJustPaired(false);
        }
        setOpen(newOpen);
    };

    // Auto-close when a scan comes in (indicates successful pairing - desktop mode only)
    useEffect(() => {
        if (!isMobile && open && lastScan && pairTimestamp) {
            const scanTime = lastScan.timestamp?.toMillis?.() || Date.now();
            if (scanTime > pairTimestamp) {
                setJustPaired(true);
                setTimeout(() => {
                    setOpen(false);
                    setJustPaired(false);
                }, 1500);
            }
        }
    }, [lastScan, open, pairTimestamp, isMobile]);

    // For mobile, we need onScan callback
    const handleMobileScan = (productId: string) => {
        if (onScan) {
            onScan(productId);
        }
    };

    if (!sessionId) return null;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Mobile mode: direct scanner
    if (isMobile) {
        return (
            <>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(true)}
                    className="gap-2"
                >
                    <Camera className="h-4 w-4" />
                    {dictionary?.createInvoiceForm?.scanProduct || 'Scan'}
                </Button>

                <MobileScannerDialog
                    open={open}
                    onOpenChange={setOpen}
                    onScan={handleMobileScan}
                    title={dictionary?.createInvoiceForm?.scanProduct || 'Scan Product'}
                />
            </>
        );
    }

    // Desktop mode: QR pairing
    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(true)}
                className="gap-2"
            >
                <Smartphone className="h-4 w-4" />
                {dictionary?.createInvoiceForm?.mobileScanner || 'Scan'}
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            {dictionary?.createInvoiceForm?.scannerPairingTitle || 'Mobile Scanner'}
                        </DialogTitle>
                        <DialogDescription>
                            {dictionary?.createInvoiceForm?.scannerPairingDesc || 'Scan this QR code with your phone to pair and start scanning products.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center py-6">
                        {justPaired ? (
                            <div className="flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in duration-300">
                                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                                    <Check className="h-10 w-10 text-green-600" />
                                </div>
                                <p className="text-lg font-semibold text-green-600">
                                    {dictionary?.createInvoiceForm?.paired || 'Paired!'}
                                </p>
                            </div>
                        ) : (
                            <PairingCode sessionId={sessionId} baseUrl={baseUrl} />
                        )}
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                        {dictionary?.createInvoiceForm?.scannerHint || 'Keep this open until paired. Scanned products will be added automatically.'}
                    </p>
                </DialogContent>
            </Dialog>
        </>
    );
}

