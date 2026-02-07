'use client';

import { useEffect, useRef } from 'react';
import { useScanSession } from '@/lib/scan-session-provider';
import { ScanEvent } from '@/lib/sync-service';

/**
 * Hook to listen for remote scan events in any component.
 * @param onScan Callback function when a new valid scan is received.
 */
export function useScanListener(onScan: (scan: ScanEvent) => void) {
    const { lastScan } = useScanSession();
    const processedScanId = useRef<string | null>(null);

    useEffect(() => {
        if (lastScan && lastScan.id !== processedScanId.current) {
            // New scan received
            processedScanId.current = lastScan.id || null;
            onScan(lastScan);
        }
    }, [lastScan, onScan]);
}
