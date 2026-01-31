'use client';

import React, { useRef, useEffect, useState } from 'react';
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


// --- 3D Components ---

function RobotModel({ mouse, isChatOpen }: { mouse: React.MutableRefObject<[number, number]>, isChatOpen: boolean }) {
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
        // Example: Play 'Wave' on load or 'Talk' when chatting?
        // For now, keep it simple: Wave on load
        const waveAnim = names.find(n => n.toLowerCase().includes('wave')) || names[0];
        if (waveAnim && actions[waveAnim]) {
            actions[waveAnim]?.reset().fadeIn(0.5).play();
        }
    }, [actions, names]);

    useFrame((state, delta) => {
        if (group.current) {
            // Track mouse ONLY if chat is NOT open (or limited tracking)
            // If chat is open, maybe look at the chat window (fixed position)

            const targetRotX = isChatOpen ? 0 : (mouse.current[1] * 0.15);
            const targetRotY = isChatOpen ? -0.2 : (mouse.current[0] * 0.35); // Look slightly left at chat

            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.1);
            group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.1);

            // Procedural Float
            group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
        }
    });

    return (
        <group ref={group} dispose={null}>
            <primitive object={scene} rotation={[0, -Math.PI / 2, 0]} />
        </group>
    );
}

function Rig({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
    const { camera } = useThree();
    useFrame(() => {
        camera.lookAt(0, 0, 0);
    });
    return null;
}

// --- Main Widget Component ---

import { useBotStore } from '@/hooks/use-bot-store';

// ... (previous code)

export default function GlobalBotWidget() {
    const { isOpen, closeBot, toggleBot } = useBotStore();
    // Local state for messages/typing remains...
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', text: 'Hello! I am your PartsManager assistant. How can I help you today?', timestamp: Date.now() }
    ]);

    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [typingMessage, setTypingMessage] = useState<string | null>(null); // Message currently being typed out

    const mouse = useRef<[number, number]>([0, 0]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, typingMessage, isThinking]);

    const handleMouseMove = (e: React.MouseEvent) => {
        // Calculate localized mouse pos for the 3D scene (small canvas)
        // This is tricky for a small fixed widget. 
        // We will just use screen normalized coords for general "looking"
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        mouse.current = [x, y];
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isThinking || typingMessage) return;

        const userText = input.trim();
        setInput('');

        // Add User Message
        setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }]);
        setIsThinking(true);

        // Prepare History for API
        const historyForApi = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: m.text
        })) as { role: 'user' | 'model'; parts: string }[];

        // Artificial Delay for "Thinking" (1-2s)
        const delay = Math.random() * 1000 + 1000;

        try {
            // Call API parallel with delay
            const [apiResult] = await Promise.all([
                sendChatMessage(historyForApi, userText),
                new Promise(resolve => setTimeout(resolve, delay))
            ]);

            setIsThinking(false);

            if (apiResult.success && apiResult.message) {
                // start typing effect
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

    // If closed, return nothing (hidden)
    if (!isOpen) return null;

    return (
        <div
            className="fixed bottom-0 right-10 z-50 flex items-end gap-4 pointer-events-none"
            onMouseMove={handleMouseMove}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="pointer-events-auto mb-20 w-[360px] h-[500px] bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-20"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-semibold text-white tracking-wide">AI Support Assistant</span>
                            </div>
                            <button onClick={closeBot} className="text-white/50 hover:text-white transition-colors">
                                <LucideX size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-sm'
                                            : 'bg-white/10 text-neutral-200 rounded-tl-sm'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {/* Typing Indicator / Active Typing */}
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

            {/* The LARGE 3D Bot, only visible when open */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="relative w-[300px] h-[400px] pointer-events-none z-10 -ml-20 translate-y-10"
            >
                <Canvas shadows dpr={[1, 2]} gl={{ alpha: true }}>
                    <ErrorBoundary FallbackComponent={() => null}>
                        <React.Suspense fallback={null}>
                            <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
                            <ambientLight intensity={0.8} />
                            <spotLight position={[10, 10, 10]} intensity={10} angle={0.5} penumbra={1} />
                            <pointLight position={[-10, -10, -10]} intensity={5} color="#8b5cf6" />
                            <Environment preset="city" />
                            <Center top>
                                <RobotModel mouse={mouse} isChatOpen={isOpen} />
                            </Center>
                            <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                            <Rig mouse={mouse} />
                        </React.Suspense>
                    </ErrorBoundary>
                </Canvas>
            </motion.div>
        </div>
    );
}

useGLTF.preload('/images/robot-model.glb');
