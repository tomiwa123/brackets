import { useState, useEffect, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { useMultiplayerStore } from './store/multiplayerStore';
import { Layout } from './components/Layout';
import { TopicInput } from './components/TopicInput';
import { BracketView } from './components/BracketView';
import { MatchupView } from './components/MatchupView';
import { WinnerView } from './components/WinnerView';
import { SettingsModal } from './components/SettingsModal';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { MatchTransitionToast } from './components/MatchTransitionToast';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const { phase: soloPhase, topic: soloTopic } = useGameStore();
  const { isMultiplayer, roomCode, roomData, startListening, resetMultiplayer } = useMultiplayerStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showMultiplayerMenu, setShowMultiplayerMenu] = useState(false);

  // Toast state: shown when status transitions into 'voting' from 'bracket'
  const [showToast, setShowToast] = useState(false);
  const prevStatusRef = useRef<string | null>(null);
  // Track whether user dismissed to avoid re-triggering for same match
  const toastMatchKeyRef = useRef<string | null>(null);

  // Keep listener active across all unmounting view components
  useEffect(() => {
    if (isMultiplayer && roomCode) {
      console.log("[App] Activating global Firestore room listener for:", roomCode);
      const unsubscribe = startListening(roomCode);
      return () => {
        console.log("[App] Deactivating global Firestore room listener for:", roomCode);
        unsubscribe();
      };
    }
  }, [isMultiplayer, roomCode, startListening]);

  // Detect bracket→voting transition to show countdown toast
  useEffect(() => {
    if (!isMultiplayer || !roomData) return;
    const currentStatus = roomData.status;
    const prevStatus = prevStatusRef.current;

    if (currentStatus === 'voting' && prevStatus === 'bracket') {
      const matchKey = `${roomData.gameState.currentRound}-${roomData.gameState.currentMatchIndex}`;
      if (toastMatchKeyRef.current !== matchKey) {
        toastMatchKeyRef.current = matchKey;
        setShowToast(true);
      }
    }

    // Also hide toast if status leaves 'voting'
    if (currentStatus !== 'voting') {
      setShowToast(false);
    }

    prevStatusRef.current = currentStatus;
  }, [isMultiplayer, roomData?.status, roomData?.gameState?.currentRound, roomData?.gameState?.currentMatchIndex]);

  // Auto-fill multiplayer if URL match exists
  const isJoinUrl = window.location.pathname.startsWith('/join/');

  // Determine active topic and phase
  const activeTopic = isMultiplayer ? roomData?.topic : soloTopic;
  
  // Decide which screen/phase to render
  // When toast is showing, stay on bracket view until user clicks Go Now
  let activePhase: string = soloPhase;
  if (isMultiplayer && roomData) {
    activePhase = (showToast && roomData.status === 'voting') ? 'bracket' : roomData.status;
  } else if (showMultiplayerMenu || isJoinUrl) {
    activePhase = 'lobby';
  }

  const handleBackToSolo = () => {
    resetMultiplayer();
    setShowMultiplayerMenu(false);
    window.history.pushState({}, '', '/');
  };

  const getRoundLabel = () => {
    if (!roomData) return 'Round';
    const r = roomData.gameState.currentRound;
    const total = Math.log2(roomData.bracketSize);
    const remaining = total - r;
    if (remaining === 0) return 'The Final';
    if (remaining === 1) return 'Semifinals';
    if (remaining === 2) return 'Quarterfinals';
    return `Round of ${Math.pow(2, remaining + 1)}`;
  };

  return (
    <Layout
      title={activeTopic ? `${activeTopic} Tournament` : undefined}
      onOpenSettings={() => setIsSettingsOpen(true)}
    >
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Match Transition Toast */}
      <AnimatePresence>
        {showToast && roomData && (
          <MatchTransitionToast
            key={toastMatchKeyRef.current || 'toast'}
            matchNumber={roomData.gameState.currentMatchIndex + 1}
            round={getRoundLabel()}
            onGoNow={() => {
              setShowToast(false);
            }}
            onDismiss={() => {
              setShowToast(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activePhase === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col items-center gap-6"
          >
            <TopicInput />
            <button
              onClick={() => setShowMultiplayerMenu(true)}
              className="px-6 py-2.5 bg-black/60 border border-[#00FFFF]/30 text-[#00FFFF] hover:border-[#00FFFF] hover:bg-[#00FFFF]/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Play with Friends (Multiplayer)
            </button>
          </motion.div>
        )}

        {activePhase === 'lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col items-center gap-6"
          >
            <MultiplayerLobby />
            {!isMultiplayer && (
              <button
                onClick={handleBackToSolo}
                className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest"
              >
                Back to Single Player
              </button>
            )}
          </motion.div>
        )}

        {(activePhase === 'bracket' || activePhase === 'generating') && (
          <motion.div
            key="bracket"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <BracketView />
          </motion.div>
        )}

        {activePhase === 'voting' && (
          <motion.div
            key="voting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full"
          >
            <MatchupView />
          </motion.div>
        )}

        {activePhase === 'winner' && (
          <motion.div
            key="winner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <WinnerView />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

export default App;

