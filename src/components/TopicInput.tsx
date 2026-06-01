import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { checkTopicAppropriateness } from '../services/moderation';

export const TopicInput: React.FC = () => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setTopic, generateBracket, bracketSize, setBracketSize, error, setError } = useGameStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Clear any previous errors
        setError(null);

        // Client-side local pre-filter validation check
        const moderation = checkTopicAppropriateness(input);
        if (!moderation.isValid) {
            setError("SAFETY_VIOLATION");
            return;
        }

        setIsLoading(true);
        setTopic(input);
        try {
            await generateBracket();
        } catch (err) {
            console.error("Bracket generation failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex justify-center items-start px-4 py-8">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ maxWidth: '36rem' }}
                className="w-full relative"
            >
                {/* Decorative elements */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-pink-500 rounded-full blur-3xl opacity-20 animate-pulse delay-700" />

                <div className="bg-black/80 backdrop-blur-xl border-2 border-[#00FFFF]/50 rounded-3xl shadow-[0_0_50px_rgba(0,255,255,0.3)] relative overflow-hidden group hover:border-[#00FFFF] transition-colors duration-500">
                    {/* Decorative Top Border */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFFF00] via-[#00FFFF] to-[#FFFF00] opacity-70" />

                    <div className="relative z-10 px-8 py-8 md:py-10">
                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="bg-gradient-to-br from-yellow-400 to-red-600 p-4 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transform -rotate-3 hover:rotate-3 transition-transform duration-300 border-2 border-white/20">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-5xl font-black italic text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#FFFF00] via-orange-500 to-red-500 uppercase tracking-tighter transform -skew-x-6 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">
                            Tournament Brackets
                        </h1>

                        {/* Description */}
                        <div className="mb-4 space-y-2 text-center">
                            <p className="text-slate-300 text-lg leading-relaxed">
                                Settle the ultimate debates with <span className="text-[#00FFFF] font-bold">AI-powered tournament brackets</span>.
                            </p>
                            <p className="text-slate-300 text-base leading-relaxed">
                                Pick any topic, watch as {bracketSize} contenders battle head-to-head, and crown the champion!
                            </p>
                            <p className="text-slate-400 text-sm italic">
                                From 90s sitcoms to Premier League legends — let the voting begin.
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center justify-center mb-6">
                            <div className="h-px bg-gradient-to-r from-transparent via-[#00FFFF]/50 to-transparent w-3/4" />
                        </div>

                        {/* Form Section */}
                        <div className="w-full flex flex-col gap-6 items-center">
                            <p className="text-center text-[#00FFFF] font-bold tracking-[0.2em] uppercase text-xs drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">
                                Start Your Tournament
                            </p>

                            {/* Bracket Size Toggle */}
                            <div className="flex flex-col items-center gap-3 w-full" style={{ maxWidth: '20rem' }}>
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    Bracket Size
                                </span>
                                <div className="w-full bg-black/60 border border-white/10 rounded-xl p-1 relative flex items-center overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setBracketSize(8)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-colors duration-200 relative z-10 ${bracketSize === 8 ? 'text-black font-black' : 'text-slate-400 hover:text-white font-bold'}`}
                                        disabled={isLoading}
                                    >
                                        8 Contenders
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBracketSize(16)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-colors duration-200 relative z-10 ${bracketSize === 16 ? 'text-black font-black' : 'text-slate-400 hover:text-white font-bold'}`}
                                        disabled={isLoading}
                                    >
                                        16 Contenders
                                    </button>
                                    {/* Sliding active background indicator */}
                                    <motion.div
                                        className="absolute inset-y-1 bg-gradient-to-r from-[#00FFFF] to-[#FFFF00] rounded-lg shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                                        initial={false}
                                        animate={{
                                            left: bracketSize === 8 ? '4px' : 'calc(50% - 2px)',
                                            width: 'calc(50% - 2px)'
                                        }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6 items-center">
                                {/* Input - Constrained width */}
                                <div className="relative group w-full flex flex-col items-center" style={{ maxWidth: '20rem' }}>
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => {
                                            setInput(e.target.value);
                                            // Clear safety error when user starts typing a new topic
                                            if (error === "SAFETY_VIOLATION") {
                                                setError(null);
                                            }
                                        }}
                                        placeholder="e.g. 90s Hip Hop Artists"
                                        className="w-full px-5 py-3.5 bg-black/50 border-2 border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#00FFFF] focus:ring-2 focus:ring-[#00FFFF]/30 transition-all text-base font-semibold text-center tracking-wide shadow-[0_0_20px_rgba(0,255,255,0.1)] focus:shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                                        disabled={isLoading}
                                    />
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00FFFF]/20 to-[#FF00FF]/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>

                                {error === "SAFETY_VIOLATION" && (
                                    <motion.div
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="w-full p-4 border-2 border-red-500/80 bg-red-950/20 rounded-xl text-center shadow-[0_0_20px_rgba(239,68,68,0.3)] border-dashed"
                                        style={{ maxWidth: '20rem' }}
                                    >
                                        <p className="text-red-400 font-black tracking-widest text-[10px] uppercase animate-pulse mb-1">
                                            🚨 SAFETY SHIELD ACTIVE 🚨
                                        </p>
                                        <p className="text-slate-300 text-xs font-semibold leading-relaxed">
                                            This topic violates our community guidelines. Let's keep it fun and friendly! 🎮
                                        </p>
                                    </motion.div>
                                )}

                                {/* Button */}
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="px-10 py-3.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 hover:from-yellow-300 hover:via-orange-400 hover:to-red-500 text-white font-black text-lg italic tracking-widest rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 uppercase border-b-4 border-red-900 active:border-b-0 active:translate-y-1"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5 fill-current" />
                                            Let's Go!
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
