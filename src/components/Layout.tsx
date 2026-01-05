import React from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';


interface LayoutProps {
    children: React.ReactNode;
    title?: string;
    onOpenSettings?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, onOpenSettings }) => {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-[#00FFFF] selection:text-black overflow-hidden relative">
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

                <motion.button
                    whileHover={{ rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onOpenSettings}
                    className="p-3 bg-white/5 rounded-full hover:bg-white/10 border-2 border-yellow-500/50 hover:border-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                >
                    <Settings className="w-6 h-6 text-yellow-400" />
                </motion.button>
            </header>

            {/* Main Content */}
            <main className="relative z-10 container mx-auto px-4 py-4 min-h-[calc(100vh-100px)] flex flex-col items-center justify-center">
                {children}
            </main>
        </div>
    );
};
