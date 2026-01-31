import { create } from 'zustand';

interface BotState {
    isOpen: boolean;
    openBot: () => void;
    closeBot: () => void;
    toggleBot: () => void;
}

export const useBotStore = create<BotState>((set) => ({
    isOpen: false,
    openBot: () => set({ isOpen: true }),
    closeBot: () => set({ isOpen: false }),
    toggleBot: () => set((state) => ({ isOpen: !state.isOpen })),
}));
