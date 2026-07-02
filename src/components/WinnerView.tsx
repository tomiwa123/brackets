import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Crown, Download, Copy, Share2, RotateCcw, Check, Loader2 } from 'lucide-react';
import { soundEngine } from '../services/sound';
import { generateChampionCard } from '../services/canvas';

export const WinnerView: React.FC = () => {
    const { matches, resetGame, bracketSize, topic } = useGameStore();
    const [imageError, setImageError] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    const [canShare, setCanShare] = React.useState(false);

    const finalRound = Math.log2(bracketSize || 16);
    const finalMatch = matches.find(m => m.round === finalRound);
    const winner = finalMatch?.winner;

    // Check for web share capabilities
    React.useEffect(() => {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            setCanShare(true);
        }
        // Play triumphant retro victory theme
        soundEngine.playVictorySound();
    }, []);

    if (!winner) return null;

    const runnerUp = finalMatch?.player1.id === winner.id ? finalMatch?.player2 : finalMatch?.player1;

    // Create a beautiful text results tree
    const getShareText = () => {
        const t = topic || "Championship";
        return `🏆 TOURNAMENT BRACKET CHAMPION 🏆\n` +
            `Topic: "${t}"\n\n` +
            `🥇 WINNER: ${winner.name}\n` +
            `"${winner.scorecard?.battleCry || 'The Champion!'}"\n\n` +
            `🥈 RUNNER-UP: ${runnerUp ? runnerUp.name : 'Finalist'}\n\n` +
            `Play your own at: brackets-jet.vercel.app 🎮`;
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(getShareText());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy text:', e);
        }
    };

    const handleDownload = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            const dataUrl = await generateChampionCard(winner, topic || "Tournament Bracket");
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${winner.name.toLowerCase().replace(/\s+/g, '-')}-champion.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error('Failed to generate canvas download:', e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
        
        try {
            const shareData: ShareData = {
                title: `${winner.name} wins the ${topic} Tournament!`,
                text: getShareText(),
            };

            // Programmatically generate canvas card image to share as a file!
            try {
                const dataUrl = await generateChampionCard(winner, topic || "Tournament Bracket");
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], 'champion.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        ...shareData,
                        files: [file]
                    });
                    return;
                }
            } catch (err) {
                console.warn('Could not attach image to share, falling back to text only:', err);
            }

            // Text-only fallback for system share sheet
            await navigator.share(shareData);
        } catch (e) {
            console.warn('System share sheet failed, executing smart desktop fallback:', e);
            // Fallback for desktop/localhost: Copy text to clipboard + Download graphic in one click!
            await handleCopy();
            handleDownload();
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 md:p-4 overflow-y-auto max-h-[92vh]">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full max-w-xl"
            >
                {/* Winner Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 blur-[80px] opacity-40 animate-pulse" />

                <div className="relative bg-black/90 border-4 border-yellow-400 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(234,179,8,0.4)] text-center w-full">
                    
                    {/* Floating Crown Icon */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                        <Crown className="w-20 h-20 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-bounce" />
                    </div>

                    <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 mt-6 mb-3 italic transform -skew-x-6 drop-shadow-sm uppercase">
                        CHAMPION
                    </h2>

                    {/* Compact Champion Display Box */}
                    <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl group">
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
                                <Crown className="w-10 h-10 text-[#FFFF00]/40 animate-pulse relative z-10" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent z-10" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                            <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-wider leading-tight">
                                {winner.name}
                            </h3>
                            <p className="text-yellow-400 font-bold text-xs mt-0.5">
                                #{winner.seed} Seed
                            </p>
                        </div>
                    </div>

                    {/* Battle Cry & Bio Accents */}
                    {winner.scorecard?.battleCry && (
                        <p className="text-cyan-400 font-bold italic tracking-wide text-sm md:text-base mb-2 max-w-[40ch] mx-auto">
                            "{winner.scorecard.battleCry}"
                        </p>
                    )}

                    {winner.scorecard?.bio && (
                        <p className="text-slate-400 text-xs md:text-sm max-w-[45ch] mx-auto mb-6 line-clamp-2">
                            {winner.scorecard.bio}
                        </p>
                    )}

                    {/* Share Action Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                        {canShare ? (
                            <>
                                {/* Web Share (if supported) */}
                                <button
                                    onClick={handleShare}
                                    className="sm:col-span-2 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20 uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer select-none"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share Champion Victory
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Copy Text Results */}
                                <button
                                    onClick={handleCopy}
                                    className={`px-5 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer select-none
                                        ${copied 
                                            ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)] text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                                            : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-white/20'}`}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 text-green-400" />
                                            Results Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy Summary
                                        </>
                                    )}
                                </button>

                                {/* Programmatic Graphic Download */}
                                <button
                                    onClick={handleDownload}
                                    disabled={isGenerating}
                                    className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 hover:border-white/20 transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                                            Generating Card...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Download Graphic
                                        </>
                                    )}
                                </button>

                                {/* Direct Social Platform Sharing links */}
                                <div className="sm:col-span-2 mt-2 pt-4 border-t border-white/10 flex flex-col items-center">
                                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-3">
                                        Share Direct to Socials
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
                                        {/* X / Twitter */}
                                        <a
                                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="py-3 bg-white/5 hover:bg-[#1DA1F2]/10 border border-white/10 hover:border-[#1DA1F2]/50 text-white hover:text-[#1DA1F2] rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                                        >
                                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                            </svg>
                                            X
                                        </a>

                                        {/* WhatsApp */}
                                        <a
                                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareText())}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="py-3 bg-white/5 hover:bg-[#25D366]/10 border border-white/10 hover:border-[#25D366]/50 text-white hover:text-[#25D366] rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                                        >
                                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.977 14.113.953 11.487.953c-5.43 0-9.85 4.37-9.854 9.799 0 1.838.514 3.633 1.488 5.23L2.17 21.83l6.237-1.636z"/>
                                            </svg>
                                            WhatsApp
                                        </a>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Reset Game Button */}
                        <button
                            onClick={resetGame}
                            className="sm:col-span-2 px-5 py-3.5 bg-gradient-to-r from-yellow-400 to-orange-600 hover:from-yellow-300 hover:to-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-500/30 uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer select-none"
                        >
                            <RotateCcw className="w-4 h-4" />
                            New Tournament
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};
