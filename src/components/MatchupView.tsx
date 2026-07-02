import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Candidate } from '../types';
import { Swords, Loader2 } from 'lucide-react';
import { soundEngine } from '../services/sound';

export const MatchupView: React.FC = () => {
    const { matches, currentRound, currentMatchIndex, vote, bracketSize } = useGameStore();
    const [activeVotedSide, setActiveVotedSide] = React.useState<'left' | 'right' | null>(null);
    const [showDetails, setShowDetails] = React.useState(false);

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
            setShowDetails(false); // Reset to collapsed for the next matchup!
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
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                setShowDetails(prev => !prev);
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
                    <span className="hidden md:inline-flex gap-1 items-center ml-2 scale-90 select-none">
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
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 max-w-[1200px] mx-auto w-full relative h-full items-start">

                {/* VS Badge (Absolute Center) - Refined */}
                <div className="absolute left-1/2 top-[200px] -translate-x-1/2 z-20 hidden md:flex flex-col items-center justify-center pointer-events-none">
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
                    showDetails={showDetails}
                    onToggleDetails={() => setShowDetails(prev => !prev)}
                />

                {/* Right Candidate */}
                <CandidateCard
                    candidate={currentMatch.player2}
                    onVote={() => handleVote(currentMatch.player2.id, 'right')}
                    side="right"
                    isWinner={false}
                    isVoted={activeVotedSide === 'right'}
                    showDetails={showDetails}
                    onToggleDetails={() => setShowDetails(prev => !prev)}
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
    showDetails: boolean;
    onToggleDetails: () => void;
}> = ({ candidate, onVote, side, isVoted, showDetails, onToggleDetails }) => {
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
            className="w-full h-full flex flex-col relative group items-center"
        >
            {/* The Unified Collector Card */}
            <div className="w-full bg-black/40 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-500 flex flex-col shadow-2xl h-full">

                {/* Image Section with Blurred Backdrop (Solution 1A) */}
                <div className="relative h-[200px] sm:h-[300px] md:h-[350px] shrink-0 w-full bg-slate-950 group-hover:brightness-110 transition-all duration-500 overflow-hidden">
                    {candidate.imageUrl && !imageError ? (
                        <>
                            {/* Blurred background image */}
                            <img
                                src={candidate.imageUrl}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
                            />
                            {/* Contained front image showing full detail */}
                            <img
                                src={candidate.imageUrl}
                                alt={candidate.name}
                                className="absolute inset-0 w-full h-full object-contain z-10 p-2"
                                onError={() => setImageError(true)}
                            />
                        </>
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
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent z-10" />
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col items-center bg-black/60 p-6 w-full">
                    {/* Name - Huge & Prominent but now in-flow */}
                    <div className="w-full mb-3">
                        <h3
                            className="font-black text-white text-center leading-tight uppercase italic tracking-tight drop-shadow-lg"
                            style={{
                                fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                                textShadow: '2px 2px 0 rgba(0,0,0,0.5)'
                            }}
                        >
                            {candidate.name}
                        </h3>
                    </div>

                    {/* Toggle Button for Collapsible Scouting Report (Solution 2A) */}
                    {!candidate.isLoading && candidate.scorecard && (
                        <button
                            type="button"
                            onClick={onToggleDetails}
                            className="mb-4 px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-[#00FFFF]/30 hover:border-[#00FFFF] rounded-full text-[10px] font-black uppercase tracking-widest text-[#00FFFF] transition-all flex items-center gap-1.5 cursor-pointer select-none"
                        >
                            {showDetails ? "Hide Scouting Report ▲" : "View Scouting Report ▼"}
                            <span className="hidden md:inline-block ml-1.5 px-1.5 py-0.5 bg-black/60 text-[#00FFFF] border border-[#00FFFF]/30 rounded text-[8px] font-mono font-black tracking-normal uppercase">
                                Space
                            </span>
                        </button>
                    )}

                    {/* Scorecard Data */}
                    <div className="w-full flex-1">
                        {candidate.isLoading || !candidate.scorecard ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 gap-3 min-h-[80px]">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <p className="text-xs font-bold uppercase tracking-widest">Scouting Report...</p>
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {showDetails && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="w-full overflow-hidden flex flex-col items-center"
                                    >
                                        {/* Battle Cry - Subtle Accent */}
                                        <p className="text-cyan-400 font-bold italic tracking-wide mb-4 text-base mt-2 text-center px-4">
                                            "{candidate.scorecard.battleCry}"
                                        </p>

                                        {/* Bio */}
                                        <div className="max-w-[45ch] mx-auto mb-6 text-center px-4">
                                            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                                                {candidate.scorecard.bio}
                                            </p>
                                        </div>

                                        {/* Attributes - Clean List */}
                                        {candidate.scorecard.attributes && candidate.scorecard.attributes.length > 0 && (
                                            <div className="w-full max-w-[400px] space-y-2 bg-white/5 rounded-xl p-4 border border-white/5 mb-4">
                                                {candidate.scorecard.attributes.map((attr, idx) => (
                                                    <div key={idx} className="flex justify-between items-center border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                                            {attr.label}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-200">
                                                            {Array.isArray(attr.value) ? attr.value.join(', ') : attr.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Vote Button - "Lickable" & Not Eerily Wide */}
                    <button
                        onClick={onVote}
                        className="
                            mt-4 mb-2
                            group relative overflow-hidden rounded-full
                            bg-gradient-to-b from-orange-500 to-red-600
                            hover:from-orange-400 hover:to-red-500
                            text-white font-black uppercase tracking-[0.2em]
                            px-12 py-3.5
                            shadow-[0_4px_0_rgb(153,27,27),0_15px_20px_-5px_rgba(220,38,38,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]
                            active:shadow-[0_0_0_rgb(153,27,27),inset_0_2px_5px_rgba(0,0,0,0.2)]
                            active:translate-y-[4px]
                            transition-all duration-100 ease-out
                            w-full max-w-[260px] md:min-w-[240px]
                            flex items-center justify-center gap-3
                            cursor-pointer
                        "
                    >
                        <span className="drop-shadow-sm flex items-center justify-center gap-3 select-none text-sm">
                            Vote
                            <span className="hidden md:inline-flex gap-1 items-center opacity-85 scale-90 shrink-0">
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
