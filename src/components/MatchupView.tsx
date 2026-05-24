import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Candidate } from '../types';
import { Swords, Loader2 } from 'lucide-react';
import { soundEngine } from '../services/sound';

export const MatchupView: React.FC = () => {
    const { matches, currentRound, currentMatchIndex, vote, bracketSize } = useGameStore();
    const [activeVotedSide, setActiveVotedSide] = React.useState<'left' | 'right' | null>(null);

    const currentMatch = matches.find(
        m => m.round === currentRound && m.matchIndex === currentMatchIndex
    );

    const handleVote = (winnerId: string, side: 'left' | 'right') => {
        if (activeVotedSide) return; // Prevent multiple quick presses
        
        setActiveVotedSide(side);
        
        // Play the retro arcade synthesizer chirp
        soundEngine.playVoteSound();

        // 180ms delay before transitioning to next matchup to allow the shake & sound to be felt
        setTimeout(() => {
            vote(winnerId);
            setActiveVotedSide(null);
        }, 180);
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }
            if (!currentMatch || activeVotedSide) return;

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                handleVote(currentMatch.player1.id, 'left');
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                handleVote(currentMatch.player2.id, 'right');
            } else if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                useGameStore.getState().showBracket();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentMatch, activeVotedSide]);

    if (!currentMatch) return null;

    const totalRounds = Math.log2(bracketSize || 16);
    const getRoundCode = (r: number, totalR: number) => {
        const remainingRounds = totalR - r;
        if (remainingRounds === 0) return 'Final';
        if (remainingRounds === 1) return 'SF';
        if (remainingRounds === 2) return 'QF';
        return 'Ro' + Math.pow(2, remainingRounds + 1);
    };

    return (
        <div className="w-full h-full flex flex-col px-4 pb-8">
            {/* Header Area - Simplified & Cleaner */}
            <div className="w-full flex flex-col md:flex-row md:justify-between items-center gap-4 mb-8 relative z-10 pt-4 px-2">
                <button
                    onClick={useGameStore.getState().showBracket}
                    className="text-white/50 hover:text-yellow-400 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest shrink-0 border border-white/10 hover:border-yellow-400/50 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-yellow-400/10 shadow-md cursor-pointer select-none"
                >
                    <Swords className="w-4 h-4 rotate-90" /> View Bracket
                    <span className="inline-flex gap-1 items-center ml-2 scale-90 select-none">
                        <kbd className="px-1.5 py-0.5 bg-black/60 text-yellow-400 border border-yellow-400/30 rounded text-[9px] font-mono font-black shadow-[0_0_5px_rgba(234,179,8,0.2)]">Esc</kbd>
                        <kbd className="px-1.5 py-0.5 bg-black/60 text-yellow-400 border border-yellow-400/30 rounded text-[9px] font-mono font-black shadow-[0_0_5px_rgba(234,179,8,0.2)]">B</kbd>
                    </span>
                </button>

                <div className="flex items-center justify-center gap-4 opacity-80 md:mr-24">
                    <div className="flex items-baseline gap-2">
                        <span className="text-yellow-500 font-bold text-xs uppercase tracking-widest">Round</span>
                        <span className="text-xl font-black text-white italic">
                            {getRoundCode(currentRound, totalRounds)}
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

                <div className="hidden md:block w-24" />
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
                    onVote={() => handleVote(currentMatch.player1.id, 'left')}
                    side="left"
                    isWinner={false}
                    isVoted={activeVotedSide === 'left'}
                />

                {/* Right Candidate */}
                <CandidateCard
                    candidate={currentMatch.player2}
                    onVote={() => handleVote(currentMatch.player2.id, 'right')}
                    side="right"
                    isWinner={false}
                    isVoted={activeVotedSide === 'right'}
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
    isVoted?: boolean;
}> = ({ candidate, onVote, side, isVoted }) => {
    const isLeft = side === 'left';
    const [imageError, setImageError] = React.useState(false);

    return (
        <motion.div
            initial={{ x: isLeft ? -50 : 50, opacity: 0 }}
            animate={isVoted ? {
                scale: [1, 1.05, 0.95, 1],
                rotate: isLeft ? [0, -2, 2, 0] : [0, 2, -2, 0],
                boxShadow: "0 0 50px rgba(249, 115, 22, 0.8)",
            } : { x: 0, opacity: 1 }}
            transition={isVoted ? { duration: 0.18, ease: "easeInOut" } : { duration: 0.5 }}
            className="h-full flex flex-col relative group items-center"
        >
            {/* The Unified Collector Card */}
            <div className="w-full bg-black/40 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-500 flex flex-col shadow-2xl h-full">

                {/* Image Section with Marquee Overlay */}
                <div className="relative h-[350px] shrink-0 w-full bg-slate-900 group-hover:brightness-110 transition-all duration-500">
                    {candidate.imageUrl && !imageError ? (
                        <img
                            src={candidate.imageUrl}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950/20 to-black p-6 relative overflow-hidden">
                            {/* Neon Grid Backing */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ff008010_1px,transparent_1px),linear-gradient(to_bottom,#ff008010_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />
                            
                            {/* Cool Cyberpunk silhouette/icon */}
                            <div className="relative w-32 h-32 rounded-2xl bg-black/40 border border-[#00FFFF]/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.15)] mb-4">
                                <Swords className="w-16 h-16 text-[#00FFFF]/40 animate-pulse" />
                            </div>
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px] bg-slate-950 px-3 py-1 rounded-full border border-white/5 relative z-10">
                                Scouting Asset Offline
                            </span>
                        </div>
                    )}

                    {/* Seed Badge - Minimalist */}
                    <div className="absolute top-4 right-4 z-20">
                        <span className="bg-black/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white/90 flex items-center gap-1 border border-white/10">
                            #{candidate.seed}
                        </span>
                    </div>

                    {/* Gradient Overlay for Image Depth */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent z-10" />
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
                            cursor-pointer
                        "
                    >
                        <span className="drop-shadow-sm flex items-center justify-center gap-3 select-none">
                            Vote
                            <span className="inline-flex gap-1 items-center opacity-85 scale-90 shrink-0">
                                {isLeft ? (
                                    <>
                                        <kbd className="px-2 py-0.5 bg-black/60 text-[#00FFFF] border border-[#00FFFF]/50 rounded text-[10px] font-mono font-bold tracking-normal uppercase shadow-[0_0_8px_rgba(0,255,255,0.3)]">A</kbd>
                                        <kbd className="px-2 py-0.5 bg-black/60 text-[#00FFFF] border border-[#00FFFF]/50 rounded text-[10px] font-mono font-bold tracking-normal uppercase shadow-[0_0_8px_rgba(0,255,255,0.3)]">←</kbd>
                                    </>
                                ) : (
                                    <>
                                        <kbd className="px-2 py-0.5 bg-black/60 text-[#00FFFF] border border-[#00FFFF]/50 rounded text-[10px] font-mono font-bold tracking-normal uppercase shadow-[0_0_8px_rgba(0,255,255,0.3)]">→</kbd>
                                        <kbd className="px-2 py-0.5 bg-black/60 text-[#00FFFF] border border-[#00FFFF]/50 rounded text-[10px] font-mono font-bold tracking-normal uppercase shadow-[0_0_8px_rgba(0,255,255,0.3)]">D</kbd>
                                    </>
                                )}
                            </span>
                        </span>
                    </button>

                </div>
            </div>
        </motion.div>
    );
};
