import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Candidate } from '../types';
import { Swords, Loader2 } from 'lucide-react';

export const MatchupView: React.FC = () => {
    const { matches, currentRound, currentMatchIndex, vote } = useGameStore();

    const currentMatch = matches.find(
        m => m.round === currentRound && m.matchIndex === currentMatchIndex
    );

    if (!currentMatch) return null;

    return (
        <div className="w-full h-full flex flex-col px-4 pb-8">
            {/* Header Area - Simplified & Cleaner */}
            <div className="text-center mb-8 relative z-10 pt-4">
                <button
                    onClick={useGameStore.getState().showBracket}
                    className="absolute left-0 top-6 text-white/50 hover:text-yellow-400 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                    <Swords className="w-4 h-4 rotate-90" /> View Bracket
                </button>

                <div className="flex items-center justify-center gap-4 opacity-80">
                    <div className="flex items-baseline gap-2">
                        <span className="text-yellow-500 font-bold text-xs uppercase tracking-widest">Round</span>
                        <span className="text-xl font-black text-white italic">
                            {currentRound === 1 ? 'Ro16' : currentRound === 2 ? 'QF' : currentRound === 3 ? 'SF' : 'Final'}
                        </span>
                    </div>
                    <span className="text-white/20">|</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-cyan-400 font-bold text-xs uppercase tracking-widest">Match</span>
                        <span className="text-xl font-black text-white italic">
                            {currentMatchIndex + 1}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Arena */}
            <div className="flex-1 grid grid-cols-2 gap-8 md:gap-12 max-w-[1200px] mx-auto w-full relative h-full items-start">

                {/* VS Badge (Absolute Center) - Refined */}
                <div className="absolute left-1/2 top-[200px] -translate-x-1/2 z-20 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border-4 border-slate-800 shadow-2xl relative z-10">
                        <span className="font-black text-white italic text-2xl pr-1">VS</span>
                    </div>
                </div>

                {/* Left Candidate */}
                <CandidateCard
                    candidate={currentMatch.player1}
                    onVote={() => vote(currentMatch.player1.id)}
                    side="left"
                    isWinner={false} // Matchup view doesn't show winner state usually
                />

                {/* Right Candidate */}
                <CandidateCard
                    candidate={currentMatch.player2}
                    onVote={() => vote(currentMatch.player2.id)}
                    side="right"
                    isWinner={false}
                />
            </div>
        </div>
    );
};

const CandidateCard: React.FC<{
    candidate: Candidate;
    onVote: () => void;
    side: 'left' | 'right';
    isWinner?: boolean;
}> = ({ candidate, onVote, side }) => {
    const isLeft = side === 'left';

    return (
        <motion.div
            initial={{ x: isLeft ? -50 : 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="h-full flex flex-col relative group items-center"
        >
            {/* The Unified Collector Card */}
            <div className="w-full bg-black/40 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-500 flex flex-col shadow-2xl h-full">

                {/* Image Section with Marquee Overlay */}
                <div className="relative h-[350px] shrink-0 w-full bg-slate-900 group-hover:brightness-110 transition-all duration-500">
                    {candidate.imageUrl ? (
                        <img
                            src={candidate.imageUrl}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
                            <span className="text-8xl font-black text-white/5 select-none">?</span>
                        </div>
                    )}

                    {/* Seed Badge - Minimalist */}
                    <div className="absolute top-4 right-4">
                        <span className="bg-black/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white/90 flex items-center gap-1 border border-white/10">
                            #{candidate.seed}
                        </span>
                    </div>

                    {/* Gradient Overlay for Image Depth */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col items-center bg-black/60 p-6 md:p-8 w-full">
                    {/* Name - Huge & Prominent but now in-flow */}
                    <div className="w-full mb-6">
                        <h3
                            className="font-black text-white text-center leading-tight uppercase italic tracking-tight drop-shadow-lg"
                            style={{
                                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                                textShadow: '2px 2px 0 rgba(0,0,0,0.5)'
                            }}
                        >
                            {candidate.name}
                        </h3>
                    </div>

                    {/* Scorecard Data */}
                    <div className="w-full flex-1 mb-8">
                        {candidate.isLoading || !candidate.scorecard ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 gap-3 min-h-[150px]">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <p className="text-xs font-bold uppercase tracking-widest">Scouting Report...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center w-full">
                                {/* Battle Cry - Subtle Accent */}
                                <p className="text-cyan-400 font-bold italic tracking-wide mb-6 text-lg">
                                    "{candidate.scorecard.battleCry}"
                                </p>

                                {/* Bio - Constrained Width for Readability (Steve Jobs' 4th suggestion) */}
                                <div className="max-w-[50ch] mx-auto mb-10">
                                    <p className="text-slate-300 text-base leading-relaxed font-medium">
                                        {candidate.scorecard.bio}
                                    </p>
                                </div>

                                {/* Attributes - Clean List */}
                                <div className="w-full max-w-[400px] space-y-3 bg-white/5 rounded-xl p-6 border border-white/5">
                                    {candidate.scorecard.attributes.map((attr, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                                {attr.label}
                                            </span>
                                            <span className="font-bold text-slate-200">
                                                {Array.isArray(attr.value) ? attr.value.join(', ') : attr.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Vote Button - "Lickable" & Not Eerily Wide */}
                    <button
                        onClick={onVote}
                        className="
                            mt-auto mb-4
                            group relative overflow-hidden rounded-full
                            bg-gradient-to-b from-orange-500 to-red-600
                            hover:from-orange-400 hover:to-red-500
                            text-white font-black uppercase tracking-[0.2em]
                            px-12 py-4
                            shadow-[0_4px_0_rgb(153,27,27),0_15px_20px_-5px_rgba(220,38,38,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]
                            active:shadow-[0_0_0_rgb(153,27,27),inset_0_2px_5px_rgba(0,0,0,0.2)]
                            active:translate-y-[4px]
                            transition-all duration-100 ease-out
                            min-w-[240px]
                            flex items-center justify-center gap-3
                        "
                    >
                        <span className="drop-shadow-sm">Vote</span>
                    </button>

                </div>
            </div>
        </motion.div>
    );
};
