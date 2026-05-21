import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Crown } from 'lucide-react';
// import Confetti from 'react-confetti';

export const WinnerView: React.FC = () => {
    const { matches, resetGame, bracketSize } = useGameStore();
    const [imageError, setImageError] = React.useState(false);

    const finalRound = Math.log2(bracketSize || 16);
    const finalMatch = matches.find(m => m.round === finalRound);
    const winner = finalMatch?.winner;

    if (!winner) return null;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
            >
                {/* Winner Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 blur-[100px] opacity-50 animate-pulse" />

                <div className="relative bg-black border-4 border-yellow-400 rounded-3xl p-8 max-w-2xl w-full shadow-[0_0_100px_rgba(234,179,8,0.5)] text-center">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                        <Crown className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] animate-bounce" />
                    </div>

                    <h2 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 mt-8 mb-4 italic transform -skew-x-6 drop-shadow-sm">
                        CHAMPION
                    </h2>

                    <div className="relative w-64 h-64 mx-auto mb-8 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl group">
                        {winner.imageUrl && !imageError ? (
                            <img
                                src={winner.imageUrl}
                                alt={winner.name}
                                className="w-full h-full object-cover"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950/20 to-black p-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ff008010_1px,transparent_1px),linear-gradient(to_bottom,#ff008010_1px,transparent_1px)] bg-[size:15px_15px] opacity-40" />
                                <Crown className="w-12 h-12 text-[#FFFF00]/40 animate-pulse relative z-10" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-3xl font-black text-white uppercase italic tracking-wider">
                                {winner.name}
                            </h3>
                            <p className="text-yellow-400 font-bold text-sm mt-1">
                                #{winner.seed} Seed
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={resetGame}
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors uppercase tracking-widest border border-white/10"
                        >
                            New Tournament
                        </button>
                        <button
                            onClick={() => {
                                // Share logic would go here
                            }}
                            className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-600 text-white font-black rounded-xl shadow-lg shadow-orange-500/40 uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            Share Victory
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
