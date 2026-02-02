'use client';

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, PerspectiveCamera, Center, Html, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { ErrorBoundary } from 'react-error-boundary';
import { LucideSend, LucideX, LucideMessageSquare, LucideMinimize2, LucideMaximize2, LucideLoader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { sendChatMessage } from '@/app/actions/ai-chat';

// --- Types ---
type Message = {
    role: 'user' | 'bot';
    text: string;
    timestamp: number;
};

// --- Utils ---
// Simulates typing effect
function Typewriter({ text, onComplete }: { text: string; onComplete?: () => void }) {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayed(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
                if (onComplete) onComplete();
            }
        }, 30); // Speed of typing
        return () => clearInterval(timer);
    }, [text, onComplete]);

    return <>{displayed}</>;
}


// --- Image Component ---
function ImagePreview({ src, alt }: { src: string; alt: string }) {
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Ensure absolute URL (Centralized logic)
    const processedSrc = src.includes('bot-images') && !src.startsWith('http')
        ? `https://partsmanager-pro.netlify.app${src.startsWith('/') ? '' : '/'}${src}`
        : src;

    return (
        <div
            className="relative group inline-block max-w-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <img
                src={processedSrc}
                alt={alt}
                className="max-w-full md:max-w-[200px] rounded-lg my-2 border border-white/10 shadow-sm cursor-zoom-in hover:brightness-110 transition-all"
                loading="lazy"
            />
            {/* Desktop Preview Popup (Portal to Body) */}
            {isHovered && mounted && createPortal(
                <div
                    className="fixed bottom-24 right-[420px] z-[99999] w-[450px] max-w-[50vw] pointer-events-none hidden md:block"
                    style={{ filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.5))' }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-neutral-900 border border-white/20 p-2 rounded-xl backdrop-blur-3xl"
                    >
                        <div className="relative">
                            <img
                                src={processedSrc}
                                alt={alt}
                                className="w-full h-auto rounded-lg bg-black/50"
                            />
                            <div className="absolute top-3 right-3 bg-black/80 text-white text-[10px] uppercase font-bold px-2 py-1 rounded backdrop-blur-md border border-white/10 tracking-widest shadow-sm">
                                Preview
                            </div>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
}

// --- 3D Components ---

function RobotModel({ mouse, isChatOpen, onClick }: { mouse: React.MutableRefObject<[number, number]>, isChatOpen: boolean, onClick?: () => void }) {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF('/images/robot-model.glb');
    const { actions, names } = useAnimations(animations, group);

    // Initial Setup
    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    child.frustumCulled = false;
                }
            });
        }
    }, [scene]);

    // Animations
    useEffect(() => {
        const waveAnim = names.find(n => n.toLowerCase().includes('wave')) || names[0];
        if (waveAnim && actions[waveAnim]) {
            actions[waveAnim]?.reset().fadeIn(0.5).play();
        }
    }, [actions, names]);

    useFrame((state) => {
        if (group.current) {
            const targetRotX = isChatOpen ? 0 : (mouse.current[1] * 0.15);
            const targetRotY = isChatOpen ? -0.2 : (mouse.current[0] * 0.35);

            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.1);
            group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.1);

            // Procedural Float
            group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
        }
    });

    return (
        <group ref={group} dispose={null} scale={2.4} onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
        }}>
            <primitive object={scene} rotation={[0, -Math.PI / 2, 0]} />
        </group>
    );
}

function Rig() {
    const { camera } = useThree();
    useFrame(() => {
        camera.lookAt(0, 0, 0);
    });
    return null;
}

// --- Main Widget Component ---

import { useBotStore } from '@/hooks/use-bot-store';

export default function GlobalBotWidget() {
    const { isOpen, closeBot } = useBotStore();
    const [isChatExpanded, setIsChatExpanded] = useState(false);

    // Reset chat expansion when closed
    useEffect(() => {
        if (!isOpen) setIsChatExpanded(false);
    }, [isOpen]);

    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', text: 'Hello! I am your PartsManager assistant. How can I help you today?', timestamp: Date.now() }
    ]);

    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [typingMessage, setTypingMessage] = useState<string | null>(null);

    const mouse = useRef<[number, number]>([0, 0]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, typingMessage, isThinking]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        mouse.current = [x, y];
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isThinking || typingMessage) return;

        const userText = input.trim();
        setInput('');

        setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }]);
        setIsThinking(true);

        const historyForApi = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: m.text
        })) as { role: 'user' | 'model'; parts: string }[];

        const delay = Math.random() * 1000 + 1000;

        try {
            const [apiResult] = await Promise.all([
                sendChatMessage(historyForApi, userText),
                new Promise(resolve => setTimeout(resolve, delay))
            ]);

            setIsThinking(false);

            if (apiResult.success && apiResult.message) {
                setTypingMessage(apiResult.message);
            } else {
                setMessages(prev => [...prev, { role: 'bot', text: apiResult.error || "Connection Error.", timestamp: Date.now() }]);
            }

        } catch (err) {
            setIsThinking(false);
            setMessages(prev => [...prev, { role: 'bot', text: "Critical System Failure.", timestamp: Date.now() }]);
        }
    };

    const handleTypingComplete = () => {
        if (typingMessage) {
            setMessages(prev => [...prev, { role: 'bot', text: typingMessage, timestamp: Date.now() }]);
            setTypingMessage(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed bottom-4 right-4 z-[100] flex items-end gap-2 pointer-events-none"
            onMouseMove={handleMouseMove}
        >
            <AnimatePresence>
                {/* Chat Window */}
                {isChatExpanded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="pointer-events-auto shadow-2xl flex flex-col overflow-hidden 
                                   fixed bottom-0 left-0 right-0 z-[1001] w-full h-[85dvh] rounded-t-2xl border-t border-white/10 bg-neutral-900/80 backdrop-blur-md
                                   md:static md:z-20 md:mb-4 md:w-[380px] md:h-[600px] md:rounded-2xl md:border md:bg-neutral-900/90"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-semibold text-white tracking-wide">AI Assistant</span>
                            </div>
                            <button onClick={() => setIsChatExpanded(false)} className="text-white/50 hover:text-white transition-colors">
                                <LucideMinimize2 size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm backdrop-blur-sm ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-900/20 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'
                                        : 'bg-neutral-800/60 text-white rounded-tl-sm shadow-black/40 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                                        }`}>
                                        {msg.text.split(/(!\[.*?\]\(.*?\))/g).map((part, i) => {
                                            const match = part.match(/!\[(.*?)\]\((.*?)\)/);
                                            if (match) {
                                                return (
                                                    <ImagePreview
                                                        key={i}
                                                        src={match[2]}
                                                        alt={match[1]}
                                                    />
                                                );
                                            }
                                            return <span key={i}>{part}</span>;
                                        })}
                                    </div>
                                </div>
                            ))}

                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}

                            {typingMessage && (
                                <div className="flex justify-start">
                                    <div className="bg-white/10 text-neutral-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
                                        <Typewriter text={typingMessage} onComplete={handleTypingComplete} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-3 bg-black/20 border-t border-white/10 flex gap-2">
                            <input
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-neutral-500"
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isThinking || typingMessage !== null}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={isThinking || typingMessage !== null || !input.trim()}
                                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <LucideSend size={18} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* The LARGE 3D Bot - Clickable */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4 }}
                className="relative cursor-pointer pointer-events-auto z-50 group"
                style={{ width: '300px', height: '450px' }}
                onClick={() => setIsChatExpanded(true)}
            >
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 rounded-full blur-3xl transition-all duration-500" />
                <Canvas shadows dpr={[1, 2]} gl={{ alpha: true }}>
                    <ErrorBoundary FallbackComponent={() => null}>
                        <React.Suspense fallback={null}>
                            {/* Adjusted Camera for Larger Appearance */}
                            <PerspectiveCamera makeDefault position={[0, 1.5, 6.5]} fov={50} />
                            <ambientLight intensity={1.5} />
                            <spotLight position={[10, 10, 10]} intensity={20} angle={0.5} penumbra={1} />
                            <pointLight position={[-10, -10, -10]} intensity={10} color="#8b5cf6" />
                            <Environment preset="city" />
                            <Center>
                                <RobotModel mouse={mouse} isChatOpen={isChatExpanded} onClick={() => setIsChatExpanded(true)} />
                            </Center>
                            <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                            <Rig />
                        </React.Suspense>
                    </ErrorBoundary>
                </Canvas>

                {/* Close Button for the Bot Model itself */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        closeBot();
                    }}
                    className="absolute top-10 right-10 z-[60] bg-neutral-800/80 hover:bg-red-500 text-white p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-md border border-white/20"
                    title="Close Assistant"
                >
                    <LucideX size={16} />
                </button>
            </motion.div>
        </div>
    );
}

useGLTF.preload('/images/robot-model.glb');
