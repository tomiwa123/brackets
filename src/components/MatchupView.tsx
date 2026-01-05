import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Candidate, Scorecard } from '../types';
import { Swords, Star, Loader2 } from 'lucide-react';

export const MatchupView: React.FC = () => {
    const { matches, currentRound, currentMatchIndex, vote } = useGameStore();

    const currentMatch = matches.find(
        m => m.round === currentRound && m.matchIndex === currentMatchIndex
    );

    // useEffect(() => {
    //     if (currentMatch) {
    //         enrichMatchup();
    //     }
    // }, [currentMatch?.id]);

    if (!currentMatch) return null;

    return (
        <div className="w-full h-full flex flex-col px-4 pb-8">
            {/* Header Area */}
            <div className="text-center mb-6 relative z-10">
                <button
                    onClick={useGameStore.getState().showBracket}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]"
                >
                    <Swords className="w-4 h-4 rotate-90" /> Bracket
                </button>

                <div className="flex items-center justify-center gap-6 mb-4">
                    <div className="flex flex-col items-center">
                        <span className="text-[#FFFF00] font-black uppercase tracking-[0.2em] text-xs drop-shadow-[0_0_5px_rgba(255,255,0,0.8)]">Round</span>
                        <span className="text-2xl font-black text-white italic">
                            {currentRound === 1 ? 'Ro16' : currentRound === 2 ? 'QF' : currentRound === 3 ? 'SF' : 'Final'}
                        </span>
                    </div>
                    <div className="w-px h-8 bg-white/20" />
                    <div className="flex flex-col items-center">
                        <span className="text-[#00FFFF] font-black uppercase tracking-[0.2em] text-xs drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">Match</span>
                        <span className="text-2xl font-black text-white italic">
                            {currentMatchIndex + 1}
                        </span>
                    </div>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic transform -skew-x-6 drop-shadow-[4px_4px_0_rgba(185,28,28,1)] pr-4">
                    {currentRound === 4 ? (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600">
                            The Final Battle
                        </span>
                    ) : (
                        "Who Wins?"
                    )}
                </h2>
            </div>

            {/* Main Arena */}
            <div className="flex-1 grid grid-cols-2 gap-8 md:gap-16 max-w-[1400px] mx-auto w-full relative h-full items-start pt-8">

                {/* VS Badge (Absolute Center) */}
                <div className="absolute left-1/2 top-48 -translate-x-1/2 z-20 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 rounded-full flex items-center justify-center border-4 border-white/10 shadow-[0_0_50px_rgba(236,72,153,0.5)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 animate-pulse" />
                        <Swords className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                    </div>
                </div>

                {/* Left Candidate */}
                <CandidatePanel
                    candidate={currentMatch.player1}
                    onVote={() => vote(currentMatch.player1.id)}
                    side="left"
                />

                {/* Right Candidate */}
                <CandidatePanel
                    candidate={currentMatch.player2}
                    onVote={() => vote(currentMatch.player2.id)}
                    side="right"
                />
            </div>
        </div>
    );
};

const CandidatePanel: React.FC<{
    candidate: Candidate;
    onVote: () => void;
    side: 'left' | 'right';
}> = ({ candidate, onVote, side }) => {
    const isLeft = side === 'left';

    return (
        <motion.div
            initial={{ x: isLeft ? -50 : 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="h-full flex flex-col gap-4 relative group items-start text-left"
        >
            {/* Image Section - Separated from card */}
            <div
                key={candidate.id}
                className="w-full relative rounded-2xl overflow-hidden bg-black shadow-[0_0_30px_rgba(0,0,0,0.5)] border-2 border-orange-500/30 shrink-0 group-hover:border-yellow-400 transition-colors duration-300"
                style={{ height: '400px', minHeight: '400px', maxHeight: '400px' }}
            >
                {candidate.imageUrl ? (
                    <img
                        src={candidate.imageUrl}
                        alt={candidate.name}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                        <span className="text-6xl font-black text-white/10 select-none">
                            {candidate.name.charAt(0)}
                        </span>
                    </div>
                )}

                {/* Seed Badge */}
                <div className="absolute top-3 right-3">
                    <span className="bg-black/60 backdrop-blur border border-yellow-400/50 px-2 py-1 rounded-lg text-xs font-black text-yellow-400 flex items-center gap-1 shadow-lg italic">
                        <Star className="w-3 h-3 fill-current" />
                        #{candidate.seed}
                    </span>
                </div>
            </div>

            {/* Name Header - Fixed height for alignment */}
            <div className="w-full text-left px-1 h-20 flex items-center">
                <h3 className="text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-[2px_2px_0_rgba(239,68,68,1)] uppercase tracking-wide line-clamp-2 italic transform -skew-x-6 py-2">
                    <span className="pr-4">{candidate.name}&nbsp;</span>
                </h3>
            </div>
            {/* Scorecard Section - The "Card" */}
            <div
                className="flex-1 w-full flex flex-col bg-black/80 backdrop-blur-md rounded-2xl border-2 border-white/10 hover:border-orange-400 hover:bg-gray-900/80 transition-all duration-300 overflow-hidden relative group-hover:shadow-[0_0_40px_rgba(249,115,22,0.3)] text-left"
            >
                <div className="flex-1 p-4 w-full overflow-y-auto custom-scrollbar">
                    {candidate.isLoading || !candidate.scorecard ? (
                        <div className="h-full flex flex-col items-center justify-center text-orange-400 gap-3 min-h-[150px]">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Scouting...</p>
                        </div>
                    ) : (
                        <ScorecardDisplay scorecard={candidate.scorecard} align={side} />
                    )}
                </div>

                {/* Vote Button Area */}
                <div className="p-3 w-full bg-black/40 border-t border-white/5 mt-auto">
                    <button
                        onClick={onVote}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-yellow-400 hover:to-orange-500 rounded-xl text-center font-black text-white transition-all uppercase tracking-[0.2em] border-b-4 border-red-900 hover:border-orange-800 active:border-b-0 active:translate-y-1 shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                        VOTE
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const ScorecardDisplay: React.FC<{ scorecard: Scorecard; align: 'left' | 'right' }> = ({ scorecard }) => {
    return (
        <div className="space-y-4 w-full">
            {/* Battle Cry - Cyan Catchphrase */}
            <div className="relative">
                <p className="text-lg md:text-xl font-black italic leading-tight text-[#00FFFF] drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]">
                    "{scorecard.battleCry}"
                </p>
            </div>

            {/* Bio - 3-4 Sentence Paragraph */}
            <div className="pt-2">
                <p className="text-slate-200 text-sm md:text-base leading-relaxed font-medium">
                    {scorecard.bio}
                </p>
            </div>

            {/* Attributes - 4 Lines */}
            <div className="pt-2 space-y-2">
                {scorecard.attributes.map((attr, idx) => (
                    <div key={idx}>
                        <span className="font-black text-xs uppercase tracking-wider text-[#00FFFF]">
                            {attr.label}:
                        </span>
                        {' '}
                        <span className="text-white font-bold text-sm md:text-base">
                            {Array.isArray(attr.value) ? attr.value.join(', ') : attr.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
