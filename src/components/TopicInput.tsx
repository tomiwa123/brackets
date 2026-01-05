import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const TopicInput: React.FC = () => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setTopic, generateBracket } = useGameStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsLoading(true);
        setTopic(input);
        await generateBracket();
        setIsLoading(false);
    };

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg relative"
        >
            {/* Decorative elements */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-pink-500 rounded-full blur-3xl opacity-20 animate-pulse delay-700" />

            <div className="bg-black/80 backdrop-blur-xl border-2 border-[#00FFFF]/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,255,255,0.3)] relative overflow-hidden group hover:border-[#00FFFF] transition-colors duration-500">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFFF00] via-[#00FFFF] to-[#FFFF00] opacity-70" />

                <div className="relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gradient-to-br from-yellow-400 to-red-600 p-4 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transform -rotate-3 hover:rotate-3 transition-transform duration-300 border-2 border-white/20">
                            <Sparkles className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    <h2 className="text-4xl font-black italic text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#FFFF00] via-orange-500 to-red-500 uppercase tracking-tighter transform -skew-x-6 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">
                        <span className="pr-4">START GAME&nbsp;</span>
                    </h2>
                    <p className="text-center text-[#00FFFF] mb-8 font-bold tracking-[0.2em] uppercase text-sm drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">
                        Enter any topic to generate a bracket
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="e.g. 80s Action Movies"
                                className="w-full px-6 py-4 bg-black/50 border-2 border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#00FFFF] focus:ring-2 focus:ring-[#00FFFF]/30 transition-all text-lg font-bold text-center uppercase tracking-wide shadow-[0_0_20px_rgba(0,255,255,0.1)] focus:shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                                disabled={isLoading}
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#FF00FF]/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>

                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="w-full py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 hover:from-yellow-300 hover:via-orange-400 hover:to-red-500 text-white font-black text-2xl italic tracking-widest rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase border-b-4 border-red-900 active:border-b-0 active:translate-y-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Play className="w-6 h-6 fill-current" />
                                    Let's Go!
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </motion.div>
    );
};
