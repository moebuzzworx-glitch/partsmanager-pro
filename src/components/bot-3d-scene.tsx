'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, PerspectiveCamera, Center, Html, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { ErrorBoundary } from 'react-error-boundary';
import { LucideSend, LucideX, LucideMinimize2 } from 'lucide-react';

// Chat Types
type Message = {
    role: 'user' | 'bot';
    text: string;
    timestamp: number;
};

// Chat Interface Component
function ChatInterface({ onClose }: { onClose: () => void }) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', text: 'Identity verified. System Online.\nHow can I assist you today, Commander?', timestamp: Date.now() }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg: Message = { role: 'user', text: inputValue, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulate API network delay
        setTimeout(() => {
            const botMsg: Message = {
                role: 'bot',
                text: `I received: "${userMsg.text}".\n(Intelligence Module Offline - Access Key Required)`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <Html position={[0, 2, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
            <div
                className="flex flex-col w-80 h-96 bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.15)] overflow-hidden font-sans select-none"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]" />
                        <span className="text-cyan-400 text-xs font-bold tracking-widest uppercase">Sentinel AI</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                            <LucideX size={14} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                                max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                                ${msg.role === 'user'
                                    ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 rounded-tr-sm'
                                    : 'bg-white/5 border border-white/10 text-neutral-300 rounded-tl-sm'}
                            `}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-white/5 flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type query..."
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isTyping}
                        className="p-2 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 rounded-xl text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <LucideSend size={16} />
                    </button>
                </form>
            </div>
        </Html>
    );
}

function RobotModel({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF('/images/robot-model.glb');
    const { actions, names } = useAnimations(animations, group);
    const [chatOpen, setChatOpen] = useState(false);

    // Initial Setup
    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.frustumCulled = false;
                }
            });
        }
    }, [scene]);

    // Play Wave Animation
    useEffect(() => {
        const waveAnim = names.find(n => n.toLowerCase().includes('wave')) || names[0];
        if (waveAnim && actions[waveAnim]) {
            actions[waveAnim]?.reset().fadeIn(0.5).play();
        }
    }, [actions, names]);

    useFrame((state, delta) => {
        if (group.current) {
            // Safety Check: Ensure mouse values are numbers
            const mx = isNaN(mouse.current[0]) ? 0 : mouse.current[0];
            const my = isNaN(mouse.current[1]) ? 0 : mouse.current[1];

            const targetRotX = my * 0.15;
            const targetRotY = mx * 0.35;

            // Safety Check: Ensure current rotation is valid
            const currentX = isNaN(group.current.rotation.x) ? 0 : group.current.rotation.x;
            const currentY = isNaN(group.current.rotation.y) ? 0 : group.current.rotation.y;

            group.current.rotation.x = THREE.MathUtils.lerp(currentX, targetRotX, 0.1);
            group.current.rotation.y = THREE.MathUtils.lerp(currentY, targetRotY, 0.1);

            // Procedural Float
            group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
        }
    });

    return (
        <group ref={group} dispose={null} onClick={(e) => { e.stopPropagation(); setChatOpen(true); }}>
            {/* Rotate -90 degrees on Y to face forward if default is Left */}
            <primitive object={scene} rotation={[0, -Math.PI / 2, 0]} />

            {chatOpen && (
                <ChatInterface onClose={() => setChatOpen(false)} />
            )}
        </group>
    );
}

function ThreeFallback({ error }: { error: any }) {
    return (
        <Html center>
            <div className="bg-red-900/80 p-4 rounded text-white border border-red-500">
                <h3 className="font-bold">3D Error</h3>
                <pre className="text-xs">{error.message}</pre>
            </div>
        </Html>
    );
}


function Rig({ mouse }: { mouse: React.MutableRefObject<[number, number]> }) {
    const { camera } = useThree();
    useFrame(() => {
        camera.lookAt(0, 0, 0);
    });
    return null;
}

export default function Bot3DScene() {
    const mouse = useRef<[number, number]>([0, 0]);

    const onMouseMove = (e: React.MouseEvent) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        mouse.current = [x, y];
    };

    return (
        <div className="w-full h-full cursor-crosshair" onMouseMove={onMouseMove}>
            <ErrorBoundary FallbackComponent={({ error }) => <div className="text-red-500 p-4">Canvas Crashed: {error.message}</div>}>
                <Canvas shadows dpr={[1, 2]}>
                    <ErrorBoundary FallbackComponent={ThreeFallback}>
                        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
                        <ambientLight intensity={0.5} />
                        <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={10} castShadow />
                        <pointLight position={[-10, -10, -10]} intensity={5} />
                        <React.Suspense fallback={<Html center>Loading 3D Model...</Html>}>
                            <Environment preset="city" />
                            <Center top>
                                <RobotModel mouse={mouse} />
                            </Center>
                            <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                            <Rig mouse={mouse} />
                        </React.Suspense>
                    </ErrorBoundary>
                </Canvas>
            </ErrorBoundary>
        </div>
    );
}
