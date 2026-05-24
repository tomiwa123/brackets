import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, RotateCcw, AlertCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';


interface LayoutProps {
    children: React.ReactNode;
    title?: string;
    onOpenSettings?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, onOpenSettings }) => {
  // Update the browser tab title when the layout title changes
  useEffect(() => {
    document.title = title ? `${title} | Bracket Master` : 'Bracket Master';
  }, [title]);
    const { phase, resetGame, error, setError } = useGameStore();

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-[#00FFFF] selection:text-black overflow-x-hidden overflow-y-auto relative">
            {/* Animated Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,0,0.15),transparent_50%)]" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#00FFFF]/20 blur-[100px] rounded-full animate-pulse" />
                <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[#FF00FF]/20 blur-[80px] rounded-full animate-pulse delay-1000" />
            </div>
            {/* Retro Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ff008020_1px,transparent_1px),linear-gradient(to_bottom,#ff008020_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] perspective-1000" />

            {/* Sun Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-yellow-500/10 to-transparent rounded-full blur-[100px]" />

            {/* Premium Neon Toast Notification */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ y: -50, x: '-50%', opacity: 0 }}
                        animate={{ y: 0, x: '-50%', opacity: 1 }}
                        exit={{ y: -50, x: '-50%', opacity: 0 }}
                        className="fixed top-6 left-1/2 z-[200] bg-black/90 border-2 border-pink-500 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-[0_0_30px_rgba(255,0,255,0.4)] w-[90%] max-w-lg"
                    >
                        <AlertCircle className="w-6 h-6 text-pink-500 shrink-0 animate-pulse" />
                        <div className="flex-1 text-left">
                            <h4 className="text-pink-500 font-bold uppercase tracking-wider text-xs">AI Scouting System Notice</h4>
                            <p className="text-white text-xs font-semibold mt-1 leading-relaxed">{error}</p>
                        </div>
                        <button 
                            onClick={() => setError(null)} 
                            className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/10 text-white/60 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider shrink-0"
                        >
                            Dismiss
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="relative z-10 p-6 flex justify-between items-center">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-2"
                >
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_4px_0_rgba(185,28,28,1)] transform -skew-x-12 filter contrast-125 pb-2">
                        <span className="pr-4">{title || 'BRACKET MASTER'}&nbsp;</span>
                    </h1>
                </motion.div>

                <div className="flex items-center gap-4">
                    {/* Reset Button */}
                    {phase !== 'input' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={resetGame}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 border-2 border-red-500/50 hover:border-red-400 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] text-red-200 font-bold uppercase tracking-wider text-xs md:text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Reset</span>
                        </motion.button>
                    )}

                    <motion.button
                        whileHover={{ rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenSettings}
                        className="p-3 bg-white/5 rounded-full hover:bg-white/10 border-2 border-yellow-500/50 hover:border-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                    >
                        <Settings className="w-6 h-6 text-yellow-400" />
                    </motion.button>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 container mx-auto px-4 py-4 min-h-[calc(100vh-100px)] flex flex-col items-center justify-center">
                {children}
            </main>
        </div>
    );
};
