import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { getPlayerId } from '../services/firebase';
import type { Candidate } from '../types';
import { Swords, Loader2, Clock, CheckCircle } from 'lucide-react';
import { soundEngine } from '../services/sound';

export const MatchupView: React.FC = () => {
    const { 
        matches: soloMatches, 
        currentRound: soloRound, 
        currentMatchIndex: soloMatchIndex, 
        vote: soloVote, 
        bracketSize: soloBracketSize 
    } = useGameStore();

    const { 
        isMultiplayer, 
        roomData, 
        isHost, 
        submitVote, 
        advanceMatch 
    } = useMultiplayerStore();

    const [activeVotedSide, setActiveVotedSide] = useState<'left' | 'right' | null>(null);
    const [showLeftDetails, setShowLeftDetails] = useState(false);
    const [showRightDetails, setShowRightDetails] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [revealWinner, setRevealWinner] = useState<{ name: string; imageUrl?: string; side: 'left' | 'right' } | null>(null);
    const isAdvancingRef = useRef(false);
    const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const playerId = getPlayerId();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

        // Get parameters depending on mode
    const isMulti = !!(isMultiplayer && roomData);
    const matches = isMulti ? roomData.gameState.matches : soloMatches;
    const currentRound = isMulti ? roomData.gameState.currentRound : soloRound;
    const currentMatchIndex = isMulti ? roomData.gameState.currentMatchIndex : soloMatchIndex;
    const bracketSize = isMulti ? roomData.bracketSize : soloBracketSize;

    const currentMatch = matches.find(
        m => m.round === currentRound && m.matchIndex === currentMatchIndex
    );

    // Track votes for multiplayer
    const activeVotes = isMulti ? roomData.gameState.activeMatchVotes : {};
    const participants = isMulti ? roomData.participants : [];
    const autoAdvance = isMulti ? roomData.settings.autoAdvance : false;
    const timerStart = isMulti ? roomData.gameState.timerStart : undefined;
    const hasVoted = isMulti && activeVotes[playerId] !== undefined;
    const votedCandidateId = isMulti ? activeVotes[playerId] : null;
    const votedCount = Object.keys(activeVotes).length;
    const totalVoters = participants.length;
    const allVoted = isMulti && totalVoters > 0 && votedCount === totalVoters;

    // Timer Effect (Host-side only advances, guest-side just counts down)
    useEffect(() => {
        if (!isMulti || !timerStart) return;

        // If all players have already voted, freeze the countdown
        if (allVoted) {
            setTimeLeft(0);
            return;
        }

        const updateTimer = () => {
            const elapsed = Math.floor((Date.now() - timerStart) / 1000);
            const remaining = Math.max(0, 60 - elapsed);
            setTimeLeft(remaining);

            // Host triggers reveal when timer hits 0
            if (isHost && remaining === 0 && autoAdvance) {
                if (!isAdvancingRef.current) {
                    isAdvancingRef.current = true;
                    triggerRevealThenAdvance();
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMulti, autoAdvance, timerStart, isHost, allVoted]);

    // Compute which candidate would win given current votes (for reveal preview)
    const computeLeader = () => {
        if (!currentMatch) return null;
        const votes = activeVotes as Record<string, string>;
        let p1Votes = 0;
        let p2Votes = 0;
        Object.values(votes).forEach((voteId) => {
            if (voteId === currentMatch.player1.id) p1Votes++;
            if (voteId === currentMatch.player2.id) p2Votes++;
        });
        if (p2Votes > p1Votes) return { candidate: currentMatch.player2, side: 'right' as const };
        return { candidate: currentMatch.player1, side: 'left' as const };
    };

    // Show winner reveal overlay, then fire advanceMatch after delay
    const triggerRevealThenAdvance = () => {
        const leader = computeLeader();
        if (leader) {
            setRevealWinner({ name: leader.candidate.name, imageUrl: leader.candidate.imageUrl, side: leader.side });
        }
        revealTimeoutRef.current = setTimeout(() => {
            setRevealWinner(null);
            advanceMatch();
        }, 2500);
    };

    // Host auto-advances when all active participants have voted
    useEffect(() => {
        if (!isMulti || !isHost || participants.length === 0) return;

        const totalVoters = participants.length;
        const votedCount = Object.keys(activeVotes).length;

        if (votedCount === totalVoters && totalVoters > 0) {
            if (!isAdvancingRef.current) {
                isAdvancingRef.current = true;
                if (autoAdvance) {
                    // Show reveal then auto-advance
                    const timeout = setTimeout(() => triggerRevealThenAdvance(), 600);
                    return () => clearTimeout(timeout);
                }
                // Manual mode: just show the reveal, host clicks to confirm
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMulti, isHost, activeVotes, participants]);

    // Reset local UI state when match changes
    useEffect(() => {
        setActiveVotedSide(null);
        setShowLeftDetails(false);
        setShowRightDetails(false);
        setRevealWinner(null);
        isAdvancingRef.current = false;
        if (revealTimeoutRef.current) {
            clearTimeout(revealTimeoutRef.current);
            revealTimeoutRef.current = null;
        }
    }, [currentMatchIndex, currentRound]);

    // Manual-mode: host clicks Advance Match which triggers reveal first
    const handleManualAdvance = () => {
        if (isAdvancingRef.current) return;
        isAdvancingRef.current = true;
        triggerRevealThenAdvance();
    };

    if (!currentMatch) return null;

    const handleVote = (winnerId: string, side: 'left' | 'right') => {
        if (isMulti) {
            if (hasVoted) return; // Prevent change of vote if already submitted
            
            // Play the retro arcade synthesizer chirp
            soundEngine.playVoteSound();
            submitVote(winnerId);
        } else {
            if (activeVotedSide) return;
            setActiveVotedSide(side);
            soundEngine.playVoteSound();

            setTimeout(() => {
                soloVote(winnerId);
                setActiveVotedSide(null);
                setShowLeftDetails(false);
                setShowRightDetails(false);
            }, 180);
        }
    };

    const handleToggleDetails = (side: 'left' | 'right') => {
        if (isMobile) {
            if (side === 'left') {
                setShowLeftDetails(prev => !prev);
            } else {
                setShowRightDetails(prev => !prev);
            }
        } else {
            const targetState = side === 'left' ? !showLeftDetails : !showRightDetails;
            setShowLeftDetails(targetState);
            setShowRightDetails(targetState);
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }
            if (!currentMatch || activeVotedSide || (isMulti && hasVoted)) return;

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                handleVote(currentMatch.player1.id, 'left');
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                handleVote(currentMatch.player2.id, 'right');
            } else if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                if (!isMulti) {
                    useGameStore.getState().showBracket();
                }
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                setShowLeftDetails(prev => !prev);
                setShowRightDetails(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentMatch, activeVotedSide, isMulti, hasVoted]);

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
            {/* Header Area */}
            <div className="w-full flex flex-col md:flex-row md:justify-between items-center gap-4 mb-6 relative z-10 pt-4 px-2">
                {!isMulti ? (
                    <button
                        onClick={useGameStore.getState().showBracket}
                        className="text-white/50 hover:text-yellow-400 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest shrink-0 border border-white/10 hover:border-yellow-400/50 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-yellow-400/10 shadow-md cursor-pointer select-none"
                    >
                        <Swords className="w-4 h-4 rotate-90" /> View Bracket
                    </button>
                ) : (
                    <div className="text-[#00FFFF]/60 text-xs font-black uppercase tracking-widest bg-[#00FFFF]/5 border border-[#00FFFF]/20 px-3 py-1.5 rounded-lg">
                        Lobby: {roomData?.roomCode}
                    </div>
                )}

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

                {isMulti && (
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest shrink-0">
                        {autoAdvance ? (
                            allVoted ? (
                                <span className="flex items-center gap-1.5 text-green-400">
                                    <CheckCircle className="w-4 h-4" /> Voting Finished
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-yellow-400 animate-pulse">
                                    <Clock className="w-4 h-4" /> {timeLeft}s
                                </span>
                            )
                        ) : isHost ? (
                            <button
                                onClick={handleManualAdvance}
                                className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider rounded-lg transition-all"
                            >
                                Advance Match
                            </button>
                        ) : (
                            <span className="text-slate-400">
                                {allVoted ? "Waiting for Host" : "Host controlled"}
                            </span>
                        )}
                    </div>
                )}
                {!isMulti && <div className="hidden md:block w-24" />}
            </div>

            {/* Multiplayer Voting Progress */}
            {isMulti && (
                <div className="w-full max-w-[400px] mx-auto mb-6 bg-white/5 border border-white/10 rounded-full px-4 py-2 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-300">
                        Voted: {Object.keys(activeVotes).length} / {participants.length} Players
                    </span>
                    {hasVoted ? (
                        <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Ready
                        </span>
                    ) : (
                        <span className="text-yellow-500 animate-pulse">Waiting...</span>
                    )}
                </div>
            )}

            {/* Main Arena */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 max-w-[1200px] mx-auto w-full relative h-full items-start">

                {/* VS Badge */}
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
                    isVoted={isMulti ? votedCandidateId === currentMatch.player1.id : activeVotedSide === 'left'}
                    hasVoted={hasVoted}
                    showDetails={showLeftDetails}
                    onToggleDetails={() => handleToggleDetails('left')}
                />

                {/* Right Candidate */}
                <CandidateCard
                    candidate={currentMatch.player2}
                    onVote={() => handleVote(currentMatch.player2.id, 'right')}
                    side="right"
                    isVoted={isMulti ? votedCandidateId === currentMatch.player2.id : activeVotedSide === 'right'}
                    hasVoted={hasVoted}
                    showDetails={showRightDetails}
                    onToggleDetails={() => handleToggleDetails('right')}
                />
            </div>

            {/* Results Reveal Overlay */}
            <AnimatePresence>
                {revealWinner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.6, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 1.1, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                            className="flex flex-col items-center gap-6 px-8 py-10 rounded-3xl bg-black/90 border-2 border-[#FFFF00]/60 shadow-[0_0_80px_rgba(255,255,0,0.3)] max-w-sm w-full mx-4"
                        >
                            {/* Winner image or icon */}
                            {revealWinner.imageUrl ? (
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: [1, 1.04, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                    className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-[#FFFF00] shadow-[0_0_30px_rgba(255,255,0,0.5)]"
                                >
                                    <img src={revealWinner.imageUrl} alt={revealWinner.name} className="w-full h-full object-cover" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], rotate: [0, -3, 3, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                    className="w-24 h-24 rounded-2xl bg-[#FFFF00]/10 border-4 border-[#FFFF00] flex items-center justify-center shadow-[0_0_30px_rgba(255,255,0,0.4)]"
                                >
                                    <Swords className="w-12 h-12 text-[#FFFF00]" />
                                </motion.div>
                            )}

                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFFF00]/60 mb-1">Winner</p>
                                <h2
                                    className="font-black uppercase italic text-white leading-tight"
                                    style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', textShadow: '0 0 30px rgba(255,255,0,0.5)' }}
                                >
                                    {revealWinner.name}
                                </h2>
                            </div>

                            {/* Animated bar showing time before advance */}
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: 2.5, ease: 'linear' }}
                                    className="h-full bg-gradient-to-r from-[#FFFF00] to-orange-500 rounded-full"
                                />
                            </div>

                            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Advancing...</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CandidateCard: React.FC<{
    candidate: Candidate;
    onVote: () => void;
    side: 'left' | 'right';
    isVoted?: boolean;
    hasVoted?: boolean;
    showDetails: boolean;
    onToggleDetails: () => void;
}> = ({ candidate, onVote, side, isVoted, hasVoted, showDetails, onToggleDetails }) => {
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
            className={`w-full h-full flex flex-col relative group items-center transition-all duration-500 ${
                hasVoted 
                    ? isVoted 
                        ? 'opacity-100 scale-[1.01] pointer-events-none' 
                        : 'opacity-30 filter blur-[0.5px] scale-[0.97] pointer-events-none'
                    : ''
            }`}
        >
            <div className={`w-full bg-black/40 backdrop-blur-md rounded-3xl overflow-hidden border transition-all duration-500 flex flex-col shadow-2xl h-full ${
                hasVoted && isVoted ? 'border-[#FFFF00] shadow-[0_0_30px_rgba(255,255,0,0.2)]' : 'border-white/10 hover:border-white/20'
            }`}>

                {/* Image Section */}
                <div className="relative h-[200px] sm:h-[300px] md:h-[350px] shrink-0 w-full bg-slate-950 group-hover:brightness-110 transition-all duration-500 overflow-hidden">
                    {candidate.imageUrl && !imageError ? (
                        <>
                            <img
                                src={candidate.imageUrl}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
                            />
                            <img
                                src={candidate.imageUrl}
                                alt={candidate.name}
                                className="absolute inset-0 w-full h-full object-contain z-10 p-2"
                                onError={() => setImageError(true)}
                            />
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950/20 to-black p-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ff008010_1px,transparent_1px),linear-gradient(to_bottom,#ff008010_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />
                            <div className="relative w-32 h-32 rounded-2xl bg-black/40 border border-[#00FFFF]/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.15)] mb-4">
                                <Swords className="w-16 h-16 text-[#00FFFF]/40 animate-pulse" />
                            </div>
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px] bg-slate-950 px-3 py-1 rounded-full border border-white/5 relative z-10">
                                Scouting Asset Offline
                            </span>
                        </div>
                    )}

                    <div className="absolute top-4 right-4 z-20">
                        <span className="bg-black/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white/90 flex items-center gap-1 border border-white/10">
                            #{candidate.seed}
                        </span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent z-10" />
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col items-center bg-black/60 p-6 w-full">
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

                    {!candidate.isLoading && candidate.scorecard && (
                        <button
                            type="button"
                            onClick={onToggleDetails}
                            className="mb-4 px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-[#00FFFF]/30 hover:border-[#00FFFF] rounded-full text-[10px] font-black uppercase tracking-widest text-[#00FFFF] transition-all flex items-center gap-1.5 cursor-pointer select-none"
                        >
                            {showDetails ? "Hide Scouting Report ▲" : "View Scouting Report ▼"}
                        </button>
                    )}

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
                                        <p className="text-cyan-400 font-bold italic tracking-wide mb-4 text-base mt-2 text-center px-4">
                                            "{candidate.scorecard.battleCry}"
                                        </p>

                                        <div className="max-w-[45ch] mx-auto mb-6 text-center px-4">
                                            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                                                {candidate.scorecard.bio}
                                            </p>
                                        </div>

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

                    <button
                        onClick={onVote}
                        disabled={hasVoted}
                        className={`
                            mt-4 mb-2
                            group relative overflow-hidden rounded-full
                            text-white font-black uppercase tracking-[0.2em]
                            px-12 py-3.5
                            w-full max-w-[260px] md:min-w-[240px]
                            flex items-center justify-center gap-3
                            cursor-pointer transition-all duration-100 ease-out
                            ${hasVoted
                                ? isVoted
                                    ? 'bg-[#FFFF00]/20 border-2 border-[#FFFF00] text-[#FFFF00] shadow-[0_0_15px_rgba(255,255,0,0.4)] cursor-default'
                                    : 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                                : 'bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 shadow-[0_4px_0_rgb(153,27,27),0_15px_20px_-5px_rgba(220,38,38,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] active:shadow-[0_0_0_rgb(153,27,27),inset_0_2px_5px_rgba(0,0,0,0.2)] active:translate-y-[4px]'
                            }
                        `}
                    >
                        <span className="drop-shadow-sm flex items-center justify-center gap-3 select-none text-sm">
                            {hasVoted ? isVoted ? 'Voted' : 'Locked' : 'Vote'}
                        </span>
                    </button>

                </div>
            </div>
        </motion.div>
    );
};
