import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Users, Loader2, Play, ArrowLeft } from 'lucide-react';
import { useMultiplayerStore } from '../store/multiplayerStore';

export const MultiplayerLobby: React.FC = () => {
  const { 
    roomCode, 
    isHost, 
    participants, 
    roomData, 
    loading, 
    error,
    createRoom, 
    joinRoom, 
    startTournament,
    resetMultiplayer 
  } = useMultiplayerStore();

  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'waiting'>('menu');
  const [topic, setTopic] = useState('');
  const [bracketSize, setBracketSize] = useState<8 | 16>(8);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [nickname, setNickname] = useState('');
  const [targetCode, setTargetCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-fill code from URL if present: /join/CODE
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/join\/([A-Z]{4})/i);
    if (match) {
      setTargetCode(match[1].toUpperCase());
      setMode('join');
    }
  }, []);

  // Set mode to waiting when roomCode is active
  useEffect(() => {
    if (roomCode) {
      setMode('waiting');
    }
  }, [roomCode]);

  const handleCopyLink = () => {
    if (!roomCode) return;
    const link = `${window.location.origin}/join/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !nickname.trim()) return;
    try {
      await createRoom(topic, bracketSize, autoAdvance, nickname);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCode.trim() || !nickname.trim()) return;
    try {
      await joinRoom(targetCode.toUpperCase(), nickname);
    } catch (err) {
      console.error(err);
    }
  };

  const generateRandomNickname = () => {
    const prefixes = ['Retro', 'Neon', 'Arcade', 'Pixel', 'Cyber', 'Laser', 'Turbo', 'Super'];
    const nouns = ['Gamer', 'Rider', 'Viper', 'Hustler', 'Runner', 'Glitch', 'Wave', 'Phantom'];
    const num = Math.floor(Math.random() * 90) + 10;
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const n = nouns[Math.floor(Math.random() * nouns.length)];
    setNickname(`${p}${n}${num}`);
  };

  if (mode === 'menu') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/80 border-2 border-[#00FFFF]/50 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,255,255,0.2)] text-center relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFFF00] via-[#00FFFF] to-[#FFFF00] opacity-70" />
          <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-[#FFFF00] via-orange-500 to-red-500 uppercase tracking-wider mb-6 transform -skew-x-6">
            Multiplayer Mode
          </h2>
          <p className="text-slate-300 text-sm mb-8 leading-relaxed">
            Create a real-time lobby, invite up to 10 friends, and vote together to determine the ultimate winner!
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode('create')}
              className="py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 hover:from-yellow-300 hover:via-orange-400 hover:to-red-500 text-white font-black text-lg tracking-widest rounded-xl transition-all transform hover:scale-[1.02] border-b-4 border-red-950 uppercase"
            >
              Host a Lobby
            </button>
            <button
              onClick={() => setMode('join')}
              className="py-4 bg-transparent border-2 border-[#00FFFF] hover:bg-[#00FFFF]/10 text-[#00FFFF] font-black text-lg tracking-widest rounded-xl transition-all uppercase"
            >
              Join with Code
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/80 border-2 border-[#00FFFF]/50 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,255,255,0.2)] relative"
        >
          <button 
            onClick={() => setMode('menu')} 
            className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h2 className="text-2xl font-black italic text-center text-transparent bg-clip-text bg-gradient-to-r from-[#FFFF00] to-orange-500 uppercase tracking-wider mb-6 transform -skew-x-6 mt-4">
            Setup Lobby
          </h2>

          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Nickname</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Enter nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#00FFFF]"
                />
                <button
                  type="button"
                  onClick={generateRandomNickname}
                  className="px-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors shrink-0 whitespace-nowrap"
                >
                  Random
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Tournament Topic</label>
              <input
                type="text"
                required
                placeholder="e.g. Best Sci-Fi Movies"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#00FFFF]"
              />
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Bracket Size
              </span>
              <div className="w-full bg-black/60 border border-white/10 rounded-xl p-1 relative flex items-center overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBracketSize(8)}
                  className={`flex-1 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-colors duration-200 z-10 ${bracketSize === 8 ? 'text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  8 Candidates
                </button>
                <button
                  type="button"
                  onClick={() => setBracketSize(16)}
                  className={`flex-1 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-colors duration-200 z-10 ${bracketSize === 16 ? 'text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  16 Candidates
                </button>
                <motion.div
                  className="absolute inset-y-1 bg-gradient-to-r from-[#00FFFF] to-[#FFFF00] rounded-lg"
                  initial={false}
                  animate={{
                    left: bracketSize === 8 ? '4px' : 'calc(50% - 2px)',
                    width: 'calc(50% - 2px)'
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Progression Style
              </span>
              <div className="w-full bg-black/60 border border-white/10 rounded-xl p-1 relative flex items-center overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAutoAdvance(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-colors duration-200 z-10 ${autoAdvance ? 'text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Auto-Advance
                </button>
                <button
                  type="button"
                  onClick={() => setAutoAdvance(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-colors duration-200 z-10 ${!autoAdvance ? 'text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Host Controlled
                </button>
                <motion.div
                  className="absolute inset-y-1 bg-gradient-to-r from-[#00FFFF] to-[#FFFF00] rounded-lg"
                  initial={false}
                  animate={{
                    left: autoAdvance ? '4px' : 'calc(50% - 2px)',
                    width: 'calc(50% - 2px)'
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center font-semibold mt-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !topic.trim() || !nickname.trim()}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 hover:from-yellow-300 hover:via-orange-400 hover:to-red-500 text-white font-black text-lg tracking-widest rounded-xl transition-all transform hover:scale-[1.02] border-b-4 border-red-950 uppercase flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              Create Lobby
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/80 border-2 border-[#00FFFF]/50 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,255,255,0.2)] relative"
        >
          <button 
            onClick={() => setMode('menu')} 
            className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h2 className="text-2xl font-black italic text-center text-transparent bg-clip-text bg-gradient-to-r from-[#FFFF00] to-orange-500 uppercase tracking-wider mb-6 transform -skew-x-6 mt-4">
            Join Lobby
          </h2>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Lobby Code</label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="e.g. PLAY"
                value={targetCode}
                onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#00FFFF] text-center font-black uppercase text-xl tracking-widest"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Nickname</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Enter nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#00FFFF]"
                />
                <button
                  type="button"
                  onClick={generateRandomNickname}
                  className="px-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors shrink-0 whitespace-nowrap"
                >
                  Random
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center font-semibold mt-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !targetCode.trim() || !nickname.trim()}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 hover:from-yellow-300 hover:via-orange-400 hover:to-red-500 text-white font-black text-lg tracking-widest rounded-xl transition-all transform hover:scale-[1.02] border-b-4 border-red-950 uppercase flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
              Join Lobby
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Lobby Waiting Screen
  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/80 border-2 border-[#00FFFF]/50 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,255,255,0.2)] text-center relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFFF00] via-[#00FFFF] to-[#FFFF00] opacity-70" />
        
        {/* Lobby Code Display */}
        <div className="mb-6">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Lobby Code</p>
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
            <span className="text-3xl font-black tracking-widest text-[#FFFF00]">{roomCode}</span>
            <button
              onClick={handleCopyLink}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Lobby Details */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#00FFFF]">{roomData?.topic}</h3>
          <p className="text-slate-400 text-xs mt-1">
            {roomData?.bracketSize} candidates | {roomData?.settings.autoAdvance ? 'Auto-Advance' : 'Host Control'}
          </p>
        </div>

        {/* Participant Count Badge */}
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-slate-300 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#00FFFF]" />
            Players ({participants.length}/10)
          </span>
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
            10 Max Limit
          </span>
        </div>

        {/* Participant list */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 max-h-48 overflow-y-auto mb-8 space-y-2">
          {participants.map((p) => (
            <div 
              key={p.id} 
              className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-2.5 border border-white/5"
            >
              <span className="text-slate-200 font-bold text-sm">{p.name}</span>
              {roomData?.hostId === p.id && (
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FFFF00] bg-[#FFFF00]/10 px-2 py-0.5 rounded-md border border-[#FFFF00]/30">
                  Host
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Loading state during AI generation */}
        {roomData?.status === 'generating' ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-8 h-8 text-[#00FFFF] animate-spin" />
            <p className="text-[#00FFFF] font-black tracking-widest text-xs uppercase animate-pulse">
              AI Contenders Battling into Seedings...
            </p>
          </div>
        ) : isHost ? (
          <div className="space-y-4">
            <button
              onClick={startTournament}
              disabled={loading || participants.length === 0}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 hover:from-yellow-300 hover:via-orange-400 hover:to-red-500 text-white font-black text-lg tracking-widest rounded-xl transition-all transform hover:scale-[1.02] border-b-4 border-red-950 uppercase flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              Start Bracket
            </button>
            <button
              onClick={resetMultiplayer}
              className="w-full text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest"
            >
              Cancel Lobby
            </button>
          </div>
        ) : (
          <div className="py-4 border-2 border-dashed border-[#00FFFF]/20 rounded-2xl bg-[#00FFFF]/5">
            <p className="text-slate-400 font-semibold text-sm">
              Waiting for Host to start...
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
