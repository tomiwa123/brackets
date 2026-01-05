import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { Layout } from './components/Layout';
import { TopicInput } from './components/TopicInput';
import { BracketView } from './components/BracketView';
import { MatchupView } from './components/MatchupView';
import { WinnerView } from './components/WinnerView';
import { SettingsModal } from './components/SettingsModal';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const { phase, topic } = useGameStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <Layout
      title={topic ? `${topic} Tournament` : undefined}
      onOpenSettings={() => setIsSettingsOpen(true)}
    >
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex justify-center"
          >
            <TopicInput />
          </motion.div>
        )}

        {phase === 'bracket' && (
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

        {phase === 'voting' && (
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

        {phase === 'winner' && (
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
