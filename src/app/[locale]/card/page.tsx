'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Phone,
    Mail,
    MapPin,
    Download,
    Share2,
    QrCode,
    Globe,
    Briefcase
} from 'lucide-react';
import { generateVCard, downloadVCard } from '@/lib/vcard-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';

// Dynamically import the 3D scene with no SSR to prevent build errors
const CardScene = dynamic(() => import('@/components/business-card/card-3d-scene'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full flex items-center justify-center bg-zinc-900/50 rounded-xl animate-pulse text-zinc-500">Loading 3D Card...</div>
});

export default function DigitalCardPage() {
    const [mounted, setMounted] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');

    // User Data - Hardcoded for Algeosys / Mohammed Rebib
    const cardData = {
        firstName: 'MOHAMMED',
        lastName: 'REBIB',
        title: 'Technico-Commercial', // Fixed spelling
        company: 'Algeosys',
        email: 'algeosys@gmail.com',
        phone: '0660 570 370',
        address: 'POS I.S.L 2 B LOTIS 30 LGTS ILOT 14 BT C LOCAL 3 CNE EL KARMA W ORAN',
        website: 'https://algeosys.com', // Assuming this, can be updated
        logoUrl: '/placeholder-logo.png' // Default, can be updated
    };

    useEffect(() => {
        setMounted(true);
        setCurrentUrl(window.location.href);
    }, []);

    const handleDownloadVCard = () => {
        const vcard = generateVCard({
            firstName: cardData.firstName,
            lastName: cardData.lastName,
            organization: cardData.company,
            title: cardData.title,
            email: cardData.email,
            phone: cardData.phone,
            address: cardData.address,
            url: cardData.website
        });
        // Create blob and download link
        const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${cardData.firstName}_${cardData.lastName}.vcf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!mounted) return null;

    return (
        <div
            className="min-h-screen text-slate-100 flex flex-col items-center pb-20 overflow-x-hidden"
            style={{ background: 'radial-gradient(circle at center, #333333 0%, #1a1a1a 100%)' }}
        >

            {/* 3D Header Section */}
            <div className="w-full max-w-md h-[450px] relative flex items-center justify-center">
                {/* Backlight for the card */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-700/30 via-neutral-900/0 to-neutral-900/0 z-0 pointer-events-none" />
                <CardScene
                    data={{
                        name: `${cardData.firstName} ${cardData.lastName}`,
                        role: cardData.title,
                        company: cardData.company,
                        email: cardData.email,
                        phone: cardData.phone
                    }}
                />
            </div>

            {/* Content Section */}
            <div className="w-full max-w-md px-6 -mt-10 z-10 space-y-6">

                {/* Profile Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        {cardData.firstName} {cardData.lastName}
                    </h1>
                    <p className="text-lg text-slate-400 font-medium">{cardData.title}</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-sm mb-4">
                        <Briefcase className="w-3 h-3 text-blue-400" />
                        <span>{cardData.company}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        onClick={handleDownloadVCard}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Save Contact
                    </Button>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full h-12 border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:text-white backdrop-blur transition-all hover:scale-105 active:scale-95">
                                <QrCode className="w-4 h-4 mr-2" />
                                Share Code
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 w-[90%] rounded-xl">
                            <DialogHeader>
                                <DialogTitle className="text-center">Scan to Connect</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center justify-center p-6 space-y-6">
                                <div className="p-4 bg-white rounded-xl shadow-xl shadow-white/10">
                                    <QRCodeSVG value={currentUrl} size={200} />
                                </div>
                                <p className="text-sm text-slate-400 text-center max-w-[200px]">
                                    Scan this with any camera to view this digital card.
                                </p>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Info Cards */}
                <div className="space-y-3 pt-4">
                    {/* Phone */}
                    <a href={`tel:${cardData.phone}`} className="block group">
                        <Card className="bg-slate-900/50 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur">
                            <CardContent className="flex items-center p-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Mobile</p>
                                    <p className="font-medium text-slate-200">{cardData.phone}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </a>

                    {/* Email */}
                    <a href={`mailto:${cardData.email}`} className="block group">
                        <Card className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur">
                            <CardContent className="flex items-center p-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="ml-4 overflow-hidden">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Email</p>
                                    <p className="font-medium text-slate-200 truncate">{cardData.email}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </a>

                    {/* Address */}
                    <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(cardData.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block group"
                    >
                        <Card className="bg-slate-900/50 border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur">
                            <CardContent className="flex items-center p-4">
                                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div className="ml-4 w-full">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Address</p>
                                    <p className="font-medium text-slate-200 text-sm leading-relaxed">{cardData.address}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                </div>

                {/* Footer */}
                <div className="pt-12 pb-4 text-center space-y-2">
                    <p className="text-xs text-slate-600 font-medium">
                        POWERED BY ALGEOSYS DIGITAL
                    </p>
                </div>

            </div>
        </div>
    );
}
