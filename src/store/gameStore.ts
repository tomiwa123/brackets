import { create } from 'zustand';
import type { GameState, Match } from '../types';
import { generateCandidates } from '../services/generator';
import { generateAllScorecards } from '../services/llm';
import { getCandidateImage } from '../services/image';

interface GameStore extends GameState {
    // Actions are already defined in GameState, but we implement them here
    enrichMatchup: () => Promise<void>; // Added enrichMatchup to interface
    showBracket: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    topic: '',
    candidates: [],
    matches: [],
    currentMatchIndex: 0,
    currentRound: 1,
    phase: 'input',

    setTopic: (topic: string) => set({ topic }),

    generateBracket: async () => {
        const { topic } = get();
        if (!topic) return;

        const candidates = await generateCandidates(topic);

        // Shuffle candidates for randomized bracket placement
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);

        // Create initial matches (Round 1)
        const matches: Match[] = [];
        for (let i = 0; i < 8; i++) {
            matches.push({
                id: `r1-m${i}`,
                round: 1,
                matchIndex: i,
                player1: shuffled[i * 2],
                player2: shuffled[i * 2 + 1],
            });
        }

        set({
            candidates: shuffled,
            matches,
            currentRound: 1,
            currentMatchIndex: 0,
            phase: 'bracket',
        });

        // Prefetch images in background
        const imagePromises = shuffled.map(async (candidate) => {
            const imageUrl = await getCandidateImage(candidate.name, topic);

            // Update candidate with image URL immediately
            const updatedCandidates = get().candidates.map(c =>
                c.id === candidate.id ? { ...c, imageUrl } : c
            );

            // Also update any matches containing this candidate
            const updatedMatches = get().matches.map(m => ({
                ...m,
                player1: m.player1.id === candidate.id ? { ...m.player1, imageUrl } : m.player1,
                player2: m.player2.id === candidate.id ? { ...m.player2, imageUrl } : m.player2,
            }));

            set({ candidates: updatedCandidates, matches: updatedMatches });
        });

        // Fetch ALL scorecards in background
        const apiKey = localStorage.getItem('llm_api_key');
        const provider = (localStorage.getItem('llm_provider') as 'gemini' | 'openai') || 'gemini';

        if (apiKey) {
            generateAllScorecards(candidates, topic, provider, apiKey).then((scorecards) => {
                const updatedCandidates = get().candidates.map(c => ({
                    ...c,
                    scorecard: scorecards[c.id]
                }));

                // Update matches with new scorecard data
                const updatedMatches = get().matches.map(m => ({
                    ...m,
                    player1: { ...m.player1, scorecard: scorecards[m.player1.id] },
                    player2: { ...m.player2, scorecard: scorecards[m.player2.id] }
                }));

                set({ candidates: updatedCandidates, matches: updatedMatches });
            });
        }

        // We don't await the entire batch to avoid blocking the UI,
        // but the individual updates will happen as they complete.
        Promise.all(imagePromises);
    },

    startVoting: () => {
        set({ phase: 'voting' });
    },

    vote: (winnerId: string) => {
        const { matches, currentMatchIndex, currentRound } = get();

        // Find current match
        const currentMatch = matches.find(
            m => m.round === currentRound && m.matchIndex === currentMatchIndex
        );

        if (!currentMatch) return;

        // Determine winner object
        const winner = currentMatch.player1.id === winnerId ? currentMatch.player1 : currentMatch.player2;

        // Update current match with winner
        const updatedMatches = matches.map(m =>
            m.id === currentMatch.id ? { ...m, winner } : m
        );

        // Check if round is complete
        const currentRoundMatches = updatedMatches.filter(m => m.round === currentRound);
        const isRoundComplete = currentRoundMatches.every(m => m.winner);

        if (isRoundComplete) {
            if (currentRound === 4) {
                // Game Over - Winner determined
                set({ matches: updatedMatches, phase: 'winner' });
            } else {
                // Prepare next round
                const nextRound = currentRound + 1;
                const nextRoundMatchesCount = currentRoundMatches.length / 2;
                const newMatches: Match[] = [];

                for (let i = 0; i < nextRoundMatchesCount; i++) {
                    const m1 = currentRoundMatches[i * 2];
                    const m2 = currentRoundMatches[i * 2 + 1];

                    if (m1.winner && m2.winner) {
                        newMatches.push({
                            id: `r${nextRound}-m${i}`,
                            round: nextRound,
                            matchIndex: i,
                            player1: m1.winner,
                            player2: m2.winner,
                        });
                    }
                }

                set({
                    matches: [...updatedMatches, ...newMatches],
                    currentRound: nextRound,
                    currentMatchIndex: 0,
                    phase: 'bracket', // Show bracket between rounds
                });
            }
        } else {
            // Next match in current round
            set({
                matches: updatedMatches,
                currentMatchIndex: currentMatchIndex + 1,
            });
        }
    },

    enrichMatchup: async () => {
        // No-op: Scorecards are fetched in background
    },

    resetGame: () => {
        set({
            topic: '',
            candidates: [],
            matches: [],
            currentMatchIndex: 0,
            currentRound: 1,
            phase: 'input',
        });
    },

    showBracket: () => {
        set({ phase: 'bracket' });
    },
}));
