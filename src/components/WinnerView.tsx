import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Crown } from 'lucide-react';
// import Confetti from 'react-confetti';

export const WinnerView: React.FC = () => {
    const { matches, resetGame } = useGameStore();

    const finalMatch = matches.find(m => m.round === 4);
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
                        {winner.imageUrl ? (
                            <img
                                src={winner.imageUrl}
                                alt={winner.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                <span className="text-8xl font-black text-white/10">{winner.name.charAt(0)}</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
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
