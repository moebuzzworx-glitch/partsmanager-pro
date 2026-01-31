'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the 3D scene to avoid SSR issues with Three.js
const Bot3DScene = dynamic(() => import('@/components/bot-3d-scene'), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center w-full h-full text-white">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-500" />
            <p>Initializing Neural Core...</p>
        </div>
    ),
});

export default function BotDemoPage() {
    return (
        <div className="flex flex-col items-center justify-center w-screen h-screen bg-neutral-950 text-white overflow-hidden relative">

            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0 pointer-events-none opacity-20" />

            {/* 3D Scene Container */}
            <div className="w-full h-full z-10 relative">
                <Bot3DScene />

                {/* Overlay UI */}
                <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-2 drop-shadow-lg">
                        Project: SENTINEL
                    </h1>
                    <p className="text-neutral-400 text-sm uppercase tracking-widest">
                        Interactive 3D Model • React Three Fiber
                    </p>
                </div>

                <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-mono text-neutral-300">Move cursor to rotate • Scroll to zoom</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
