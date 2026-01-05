import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Match } from '../types';
import { Trophy, ChevronRight, Zap } from 'lucide-react';

export const BracketView: React.FC = () => {
    const { matches, currentRound, startVoting } = useGameStore();

    const rounds = [1, 2, 3, 4];
    const matchesByRound = rounds.reduce((acc, round) => {
        acc[round] = matches.filter(m => m.round === round).sort((a, b) => a.matchIndex - b.matchIndex);
        return acc;
    }, {} as Record<number, Match[]>);

    return (
        <div className="w-full h-full flex flex-col items-center">
            <div className="w-full overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-black">
                <div className="min-w-[1200px] flex justify-between px-8 gap-0">
                    {rounds.map((round) => {
                        const roundMatches = matchesByRound[round] || [];
                        const totalMatchesInRound = round === 1 ? 8 : round === 2 ? 4 : round === 3 ? 2 : 1;
                        const placeholdersNeeded = totalMatchesInRound - roundMatches.length;

                        // Calculate height for each slot in this round
                        // Base height for Round 1 items
                        const BASE_HEIGHT = 100;
                        const slotHeight = BASE_HEIGHT * Math.pow(2, round - 1);

                        return (
                            <div key={round} className="flex flex-col justify-center flex-1 relative">
                                <h3 className="absolute -top-16 left-0 right-0 text-center text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-500 font-black text-3xl uppercase tracking-widest mb-4 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] italic transform -skew-x-6">
                                    {round === 1 ? 'Round of 16' :
                                        round === 2 ? 'Quarterfinals' :
                                            round === 3 ? 'Semifinals' : 'The Final'}
                                </h3>
                                <div className="flex flex-col w-full mt-8">
                                    {roundMatches.map((match) => (
                                        <div
                                            key={match.id}
                                            style={{ height: slotHeight }}
                                            className="w-full flex items-center justify-center px-4 relative"
                                        >
                                            {/* Connector Lines */}
                                            {round > 1 && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/20" />
                                            )}
                                            {round < 4 && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/20" />
                                            )}
                                            {/* Vertical Connectors for previous round children */}
                                            {round > 1 && (
                                                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/20 my-auto"
                                                    style={{ height: slotHeight / 2 }}
                                                />
                                            )}

                                            <div className="w-full z-10">
                                                <MatchCard match={match} />
                                            </div>
                                        </div>
                                    ))}
                                    {Array.from({ length: placeholdersNeeded }).map((_, i) => (
                                        <div
                                            key={`placeholder-${round}-${i}`}
                                            style={{ height: slotHeight }}
                                            className="w-full flex items-center justify-center px-4 relative"
                                        >
                                            {/* Connector Lines for Placeholders */}
                                            {round > 1 && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/10" />
                                            )}
                                            {round < 4 && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/10" />
                                            )}

                                            <div className="w-full z-10">
                                                <PlaceholderMatchCard
                                                    round={round}
                                                    matchIndex={roundMatches.length + i}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(249, 115, 22, 0.6)" }}
                whileTap={{ scale: 0.95 }}
                onClick={startVoting}
                className="mt-8 px-12 py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-black text-2xl rounded-2xl shadow-lg shadow-orange-500/40 flex items-center gap-3 border-4 border-white/20 uppercase tracking-widest italic transform -skew-x-6 hover:-translate-y-1 transition-all"
            >
                <Trophy className="w-8 h-8 text-yellow-200" />
                {currentRound === 1 && matches.length === 8 ? 'Start Tournament' : 'Continue Tournament'}
                <ChevronRight className="w-8 h-8" />
            </motion.button>
        </div>
    );
};

const MatchCard: React.FC<{ match: Match }> = ({ match }) => {
    const isDecided = !!match.winner;

    // Helper to calculate game number for existing matches
    const getGameNum = (r: number, idx: number) => {
        const offset = r === 1 ? 0 : r === 2 ? 8 : r === 3 ? 12 : 14;
        return offset + idx + 1;
    };

    const gameNum = getGameNum(match.round, match.matchIndex);

    return (
        <div className={`
      relative bg-black/90 border-2 rounded-xl p-3 min-h-[90px] flex flex-col justify-center transition-all duration-300
      ${isDecided ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'border-white/10 hover:border-yellow-500/50'}
    `}>
            <div className="absolute -top-3 -left-2 bg-red-600 text-[10px] font-black text-white px-2 py-0.5 rounded border border-white/20 shadow-md transform -rotate-6 z-20">
                G{gameNum}
            </div>

            <div className={`
        flex items-center justify-center p-2 rounded-lg mb-1 transition-colors w-full
        ${match.winner?.id === match.player1.id
                    ? 'bg-gradient-to-r from-[#00FFFF]/20 to-[#00FFFF]/10 text-[#00FFFF] font-black border border-[#00FFFF]/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                    : 'text-slate-400'}
      `}>
                <span className="truncate text-sm font-bold uppercase tracking-wide text-center px-6">{match.player1.name}</span>
            </div>

            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#00FFFF]/50 to-transparent my-1" />

            <div className={`
        flex items-center justify-center p-2 rounded-lg transition-colors w-full
        ${match.winner?.id === match.player2.id
                    ? 'bg-gradient-to-r from-[#00FFFF]/20 to-[#00FFFF]/10 text-[#00FFFF] font-black border border-[#00FFFF]/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]'
                    : 'text-slate-400'}
      `}>
                <span className="truncate text-sm font-bold uppercase tracking-wide text-center px-6">{match.player2.name}</span>
            </div>

            {
                isDecided && (
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 bg-[#FFFF00] rounded-full p-1.5 shadow-[0_0_15px_rgba(255,255,0,0.8)] border-2 border-black z-20">
                        <Zap className="w-3 h-3 text-black fill-current" />
                    </div>
                )
            }
        </div >
    );
};

const PlaceholderMatchCard: React.FC<{ round: number; matchIndex: number }> = ({ round, matchIndex }) => {
    const { matches } = useGameStore();

    // Calculate global game number
    const getGameNum = (r: number, idx: number) => {
        const offset = r === 1 ? 0 : r === 2 ? 8 : r === 3 ? 12 : 14;
        return offset + idx + 1;
    };

    const currentGameNum = getGameNum(round, matchIndex);

    // Calculate source game numbers and IDs
    const sourceRound = round - 1;
    const sourceMatch1Index = matchIndex * 2;
    const sourceMatch2Index = matchIndex * 2 + 1;

    const sourceGame1 = getGameNum(sourceRound, sourceMatch1Index);
    const sourceGame2 = getGameNum(sourceRound, sourceMatch2Index);

    // Find source matches to check for winners
    const sourceMatch1 = matches.find(m => m.round === sourceRound && m.matchIndex === sourceMatch1Index);
    const sourceMatch2 = matches.find(m => m.round === sourceRound && m.matchIndex === sourceMatch2Index);

    const name1 = sourceMatch1?.winner ? sourceMatch1.winner.name : `Winner G${sourceGame1}`;
    const name2 = sourceMatch2?.winner ? sourceMatch2.winner.name : `Winner G${sourceGame2}`;

    return (
        <div className="relative bg-black/40 border-2 border-white/5 rounded-xl p-3 min-h-[90px] flex flex-col justify-center border-dashed group hover:border-[#00FFFF]/30 transition-colors">
            <div className="absolute -top-3 -left-2 bg-slate-800 text-[10px] font-bold text-[#00FFFF] px-2 py-0.5 rounded border border-[#00FFFF]/30 transform -rotate-6 z-20 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                G{currentGameNum}
            </div>

            <div className={`flex items-center justify-center p-2 rounded-lg mb-1 w-full ${sourceMatch1?.winner ? 'text-[#00FFFF] font-black uppercase tracking-wide drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]' : 'text-slate-600 italic'}`}>
                <span className="truncate text-sm text-center px-6">
                    {name1}
                </span>
            </div>

            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#00FFFF]/20 to-transparent my-1" />

            <div className={`flex items-center justify-center p-2 rounded-lg w-full ${sourceMatch2?.winner ? 'text-[#00FFFF] font-black uppercase tracking-wide drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]' : 'text-slate-600 italic'}`}>
                <span className="truncate text-sm text-center px-6">
                    {name2}
                </span>
            </div>
        </div>
    );
};
