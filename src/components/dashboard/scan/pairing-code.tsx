'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface PairingCodeProps {
    sessionId: string;
    baseUrl: string;
}

export function PairingCode({ sessionId, baseUrl }: PairingCodeProps) {
    // The URL the mobile phone should open to pair
    // We'll create a route like /pair/[sessionId] or just use a query param
    const pairingUrl = `${baseUrl}/scan?session=${sessionId}`;

    return (
        <div className="flex flex-col items-center justify-center space-y-6 text-center p-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Connect Mobile Scanner</h2>
                <p className="text-muted-foreground text-sm max-w-[300px] mx-auto">
                    Scan this code with your phone (or the in-app scanner) to use it as a remote barcode reader.
                </p>
            </div>

            <div className="p-4 bg-white rounded-xl border shadow-sm">
                <QRCodeSVG
                    value={pairingUrl}
                    size={200}
                    level="H"
                    includeMargin
                />
            </div>

            <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded md:hidden">
                    <span className="text-muted-foreground">Session:</span>
                    <code className="font-mono font-bold">{sessionId.slice(0, 8)}...</code>
                </div>
            </div>
        </div>
    );
}
