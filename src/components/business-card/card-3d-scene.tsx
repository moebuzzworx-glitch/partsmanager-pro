'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface CardProps {
    name: string;
    role: string;
    company: string;
    email: string;
    phone: string;
}

export default function CardScene({ data }: { data: CardProps }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["20deg", "-20deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-20deg", "20deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const handleCardClick = () => {
        setIsFlipped(!isFlipped);
    };

    return (
        <div
            className="w-full h-[400px] flex items-center justify-center perspective-[1000px] cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCardClick}
        >
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                animate={{
                    rotateY: isFlipped ? 180 : 0,
                    y: [0, -10, 0], // Subtle float animation
                }}
                transition={{
                    rotateY: { duration: 0.6 },
                    y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                }}
                className="relative w-[340px] h-[200px] md:w-[420px] md:h-[250px] transition-all duration-200"
            >
                {/* ================= CARD FRONT ================= */}
                <div
                    className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border-2 border-[#bfa15f]/20 backface-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #050505 0%, #000000 100%)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                    }}
                >
                    {/* Grain/Noise Texture Overlay */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

                    {/* Content Container */}
                    <div className="relative z-10 w-full h-full p-8 flex flex-col justify-between">

                        {/* Top Section */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#bfa15f] via-[#FFFFac] to-[#bfa15f]" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.8))' }}>
                                    {data.company}
                                </h2>
                                <div className="h-[2px] w-12 bg-gradient-to-r from-[#bfa15f] to-transparent mt-2" />
                            </div>
                            {/* Metal Chip Sim */}
                            <div className="w-10 h-8 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-600 shadow-inner opacity-80" />
                        </div>

                        {/* Bottom Section */}
                        <div className="flex justify-between items-end mt-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>
                                    {data.name}
                                </h1>
                                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#bfa15f]">
                                    {data.role}
                                </p>
                            </div>

                            <div className="text-right">
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-mono text-gray-400 tracking-wider hover:text-white transition-colors">{data.email}</span>
                                    <span className="text-[10px] font-mono text-gray-400 tracking-wider hover:text-white transition-colors">{data.phone}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= CARD BACK ================= */}
                <div
                    className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border-2 border-[#bfa15f]/20 backface-hidden flex items-center justify-center bg-black"
                    style={{
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        background: 'linear-gradient(135deg, #050505 0%, #000000 100%)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
                    }}
                >
                    {/* Grain/Noise Texture Overlay */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-4xl font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-b from-[#bfa15f] via-[#FFFFac] to-[#bfa15f] opacity-20">
                            Algeosys
                        </h2>
                        <p className="text-[#bfa15f] text-xs font-mono mt-4 tracking-widest opacity-60">
                            Tap to Flip
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
