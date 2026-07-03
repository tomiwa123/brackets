import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useMultiplayerStore } from '../store/multiplayerStore';
import type { Match } from '../types';
import { Trophy, ChevronRight, Zap, Loader2 } from 'lucide-react';

export const BracketView: React.FC = () => {
    const { 
        matches: soloMatches, 
        currentRound: soloRound, 
        startVoting: soloStartVoting, 
        bracketSize: soloBracketSize 
    } = useGameStore();

    const { 
        isMultiplayer, 
        roomData, 
        isHost, 
        startVoting: multiStartVoting 
    } = useMultiplayerStore();

    // Determine parameters based on multiplayer context
    const isMulti = isMultiplayer && roomData;
    const matches = isMulti ? roomData.gameState.matches : soloMatches;
    const currentRound = isMulti ? roomData.gameState.currentRound : soloRound;
    const bracketSize = isMulti ? roomData.bracketSize : soloBracketSize;
    const startVoting = isMulti ? multiStartVoting : soloStartVoting;

    const [selectedRoundTab, setSelectedRoundTab] = React.useState(currentRound);
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-select new round tab when currentRound changes from Firestore
    React.useEffect(() => {
        setSelectedRoundTab(currentRound);
    }, [currentRound]);

    const totalRounds = Math.log2(bracketSize || 16);
    const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);
    const matchesByRound = rounds.reduce((acc, round) => {
        acc[round] = matches.filter(m => m.round === round).sort((a, b) => a.matchIndex - b.matchIndex);
        return acc;
    }, {} as Record<number, Match[]>);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isMulti || isHost) {
                    startVoting();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [startVoting, isMulti, isHost]);

    return (
        <div className="w-full h-full flex flex-col items-center">
            {/* Mobile Round Selection Tabs */}
            <div className="flex md:hidden justify-center gap-2 mb-10 w-full max-w-md px-4 shrink-0">
                {rounds.map((round) => {
                    const getRoundShortTitle = (r: number, totalR: number) => {
                        const remainingRounds = totalR - r;
                        if (remainingRounds === 0) return 'Final';
                        if (remainingRounds === 1) return 'Semifinals';
                        if (remainingRounds === 2) return 'Quarterfinals';
                        return `Round of ${Math.pow(2, remainingRounds + 1)}`;
                    };
                    return (
                        <button
                            key={round}
                            type="button"
                            onClick={() => setSelectedRoundTab(round)}
                            className={`flex-1 py-2.5 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                                selectedRoundTab === round
                                    ? 'bg-[#00FFFF] text-black border-[#00FFFF] shadow-[0_0_15px_rgba(0,255,255,0.4)]'
                                    : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                            }`}
                        >
                            {getRoundShortTitle(round, totalRounds)}
                        </button>
                    );
                })}
            </div>

            <div className="w-full overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-black">
                <div className="min-w-0 md:min-w-[1200px] w-full md:w-auto flex justify-between px-4 md:px-8 gap-0">
                    {rounds.map((round) => {
                        const roundMatches = matchesByRound[round] || [];
                        const totalMatchesInRound = (bracketSize || 16) / Math.pow(2, round);
                        const placeholdersNeeded = totalMatchesInRound - roundMatches.length;

                        const BASE_HEIGHT = 100;
                        const slotHeight = BASE_HEIGHT * Math.pow(2, round - 1);

                        const getRoundTitle = (r: number, totalR: number) => {
                            const remainingRounds = totalR - r;
                            if (remainingRounds === 0) return 'The Final';
                            if (remainingRounds === 1) return 'Semifinals';
                            if (remainingRounds === 2) return 'Quarterfinals';
                            return `Round of ${Math.pow(2, remainingRounds + 1)}`;
                        };

                        return (
                            <div key={round} className={`flex-col justify-center flex-1 relative ${round === selectedRoundTab ? 'flex' : 'hidden md:flex'}`}>
                                <h3 className="absolute -top-16 left-0 right-0 text-center text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-500 font-black text-3xl uppercase tracking-widest mb-4 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] italic transform -skew-x-6">
                                    {getRoundTitle(round, totalRounds)}
                                </h3>
                                <div className="flex flex-col w-full mt-8 gap-5 md:gap-0">
                                    {roundMatches.map((match) => (
                                        <div
                                            key={match.id}
                                            style={isMobile ? undefined : { height: slotHeight }}
                                            className="w-full flex items-center justify-center px-4 relative"
                                        >
                                            {round > 1 && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/20 hidden md:block" />
                                            )}
                                            {round < totalRounds && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/20 hidden md:block" />
                                            )}
                                            {round > 1 && (
                                                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/20 my-auto hidden md:block"
                                                    style={{ height: slotHeight / 2 }}
                                                />
                                            )}

                                            <div className="w-full z-10">
                                                <MatchCard match={match} bracketSize={bracketSize} />
                                            </div>
                                        </div>
                                    ))}
                                    {Array.from({ length: placeholdersNeeded }).map((_, i) => (
                                        <div
                                            key={`placeholder-${round}-${i}`}
                                            style={isMobile ? undefined : { height: slotHeight }}
                                            className="w-full flex items-center justify-center px-4 relative"
                                        >
                                            {round > 1 && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/10" />
                                            )}
                                            {round < totalRounds && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/10" />
                                            )}

                                            <div className="w-full z-10">
                                                <PlaceholderMatchCard
                                                    round={round}
                                                    matchIndex={roundMatches.length + i}
                                                    matches={matches}
                                                    bracketSize={bracketSize}
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

            {isMulti && !isHost ? (
                <div className="mt-8 px-8 py-4 bg-black/60 border-2 border-dashed border-[#00FFFF]/30 rounded-2xl flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#00FFFF] animate-spin" />
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">
                        Waiting for Host to start voting...
                    </span>
                </div>
            ) : (
                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(249, 115, 22, 0.6)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startVoting}
                    className="mt-8 px-6 py-4 sm:px-12 sm:py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-black text-lg sm:text-2xl rounded-2xl shadow-lg shadow-orange-500/40 flex items-center gap-2 sm:gap-3 border-2 sm:border-4 border-white/20 uppercase tracking-widest italic transform -skew-x-6 hover:-translate-y-1 transition-all"
                >
                    <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-200" />
                    <span className="truncate">
                        {currentRound === 1 && matches.length === ((bracketSize || 16) / 2) ? 'Start Tournament' : 'Continue Tournament'}
                    </span>
                    <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
                </motion.button>
            )}
        </div>
    );
};

const MatchCard: React.FC<{ match: Match; bracketSize: number }> = ({ match, bracketSize }) => {
    const isDecided = !!match.winner;

    const getGameNum = (r: number, idx: number, size: number) => {
        let offset = 0;
        for (let i = 1; i < r; i++) {
            offset += size / Math.pow(2, i);
        }
        return offset + idx + 1;
    };

    const gameNum = getGameNum(match.round, match.matchIndex, bracketSize || 16);

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

const PlaceholderMatchCard: React.FC<{ 
    round: number; 
    matchIndex: number; 
    matches: Match[]; 
    bracketSize: number; 
}> = ({ round, matchIndex, matches, bracketSize }) => {

    const getGameNum = (r: number, idx: number, size: number) => {
        let offset = 0;
        for (let i = 1; i < r; i++) {
            offset += size / Math.pow(2, i);
        }
        return offset + idx + 1;
    };

    const currentGameNum = getGameNum(round, matchIndex, bracketSize || 16);

    const sourceRound = round - 1;
    const sourceMatch1Index = matchIndex * 2;
    const sourceMatch2Index = matchIndex * 2 + 1;

    const sourceGame1 = getGameNum(sourceRound, sourceMatch1Index, bracketSize || 16);
    const sourceGame2 = getGameNum(sourceRound, sourceMatch2Index, bracketSize || 16);

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
