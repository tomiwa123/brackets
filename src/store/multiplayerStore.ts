import { create } from 'zustand';
import { 
  createRoomInFirestore, 
  joinRoomInFirestore, 
  listenToRoomInFirestore, 
  updateRoomStatus, 
  initializeRoomTournament, 
  submitVoteInFirestore, 
  advanceMatchInFirestore, 
  getPlayerId,
  closeRoom,
  transferHost,
  updateScorecardsOnly,
  startVotingInFirestore,
  extendTimerInFirestore
} from '../services/firebase';
import type { RoomData, RoomParticipant } from '../services/firebase';
import { generateCandidates } from '../services/generator';
import { generateAllScorecards } from '../services/llm';
import type { Match } from '../types';

interface MultiplayerStore {
  isMultiplayer: boolean;
  roomCode: string | null;
  isHost: boolean;
  nickname: string;
  participants: RoomParticipant[];
  roomData: RoomData | null;
  loading: boolean;
  error: string | null;

  createRoom: (topic: string, bracketSize: number, autoAdvance: boolean, nickname: string) => Promise<string>;
  preGenerateLobbyData: (roomCode: string, topic: string, bracketSize: number) => Promise<void>;
  joinRoom: (roomCode: string, nickname: string) => Promise<void>;
  startListening: (roomCode: string) => () => void;
  startTournament: () => Promise<void>;
  startVoting: () => Promise<void>;
  submitVote: (candidateId: string) => Promise<void>;
  advanceMatch: () => Promise<void>;
  extendTimer: () => Promise<void>;
  resetMultiplayer: () => void;
}

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  return {
    isMultiplayer: false,
    roomCode: null,
    isHost: false,
    nickname: '',
    participants: [],
    roomData: null,
    loading: false,
    error: null,

    createRoom: async (topic, bracketSize, autoAdvance, nickname) => {
      set({ loading: true, error: null });
      try {
        const roomCode = await createRoomInFirestore(topic, bracketSize, autoAdvance);
        
        // Automatically join as host
        await joinRoomInFirestore(roomCode, nickname);

        set({ 
          isMultiplayer: true, 
          roomCode, 
          isHost: true, 
          nickname,
          loading: false 
        });

        // Trigger pre-generation of contenders in background
        get().preGenerateLobbyData(roomCode, topic, bracketSize);

        return roomCode;
      } catch (err: any) {
        console.error("[Store] Error during createRoom flow:", err);
        set({ error: err.message || "Failed to create room.", loading: false });
        throw err;
      }
    },

    joinRoom: async (roomCode, nickname) => {
      set({ loading: true, error: null });
      try {
        await joinRoomInFirestore(roomCode, nickname);
        set({ 
          isMultiplayer: true, 
          roomCode: roomCode.toUpperCase(), 
          isHost: false, 
          nickname,
          loading: false 
        });
      } catch (err: any) {
        console.error("[Store] Error during joinRoom flow:", err);
        let userMessage = "Failed to join room. Please check your connection.";
        if (err.message === "ROOM_NOT_FOUND") {
          userMessage = "This lobby code doesn't exist. Double check the code and try again!";
        } else if (err.message === "ROOM_FULL") {
          userMessage = "This lobby is already full (max 10 players).";
        } else if (err.message === "ROOM_CLOSED") {
          userMessage = "This lobby has already been closed by the host.";
        } else if (err.message === "GAME_IN_PROGRESS") {
          userMessage = "This tournament has already started. You can't join once the bracket begins!";
        }
        set({ error: userMessage, loading: false });
        throw err;
      }
    },

    startListening: (roomCode) => {
      if (unsubscribe) unsubscribe();

      const currentUnsub = listenToRoomInFirestore(
        roomCode,
        (data) => {
          // Handle room closure: auto-reset for non-host players
          if (data.status === 'closed') {
            const playerId = getPlayerId();
            if (data.hostId !== playerId) {
              set({ error: 'The host has ended this session.' });
              // Allow the error to display briefly before resetting
              setTimeout(() => get().resetMultiplayer(), 3000);
            }
            return;
          }

          const playerId = getPlayerId();
          const isHost = data.hostId === playerId;
          set({ 
            roomData: data, 
            participants: data.participants, 
            isHost, 
            roomCode: data.roomCode 
          });
        },
        (err) => {
          set({ error: err.message || "Lost connection to room." });
        }
      );
      unsubscribe = currentUnsub;

      // Fix 4: Capture specific unsub reference to avoid closure bugs
      return () => {
        currentUnsub();
        if (unsubscribe === currentUnsub) {
          unsubscribe = null;
        }
      };
    },

    preGenerateLobbyData: async (roomCode, topic, bracketSize) => {
      try {
        const candidates = await generateCandidates(topic, bracketSize);
        if (!candidates || candidates.length === 0) {
          throw new Error("No candidates generated.");
        }

        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        const matches: Match[] = [];
        const matchCount = bracketSize / 2;

        for (let i = 0; i < matchCount; i++) {
          matches.push({
            id: `r1-m${i}`,
            round: 1,
            matchIndex: i,
            player1: shuffled[i * 2],
            player2: shuffled[i * 2 + 1],
          });
        }

        // Initialize in Firestore but keep status as 'lobby'
        await initializeRoomTournament(roomCode, shuffled, matches, 'lobby');

        // Background: Fetch scorecards
        const apiKey = localStorage.getItem('llm_api_key') || '';
        const provider = (localStorage.getItem('llm_provider') as 'gemini' | 'openai') || 'gemini';
        
        generateAllScorecards(shuffled, topic, provider, apiKey).then(async (scorecards) => {
          // Fix 1: Check current status before writing — don't overwrite if tournament started
          const currentStatus = get().roomData?.status;
          const updatedCandidates = shuffled.map(c => ({
            ...c,
            scorecard: scorecards[c.id] || c.scorecard
          }));
          const updatedMatches = matches.map(m => ({
            ...m,
            player1: { ...m.player1, scorecard: scorecards[m.player1.id] || m.player1.scorecard },
            player2: { ...m.player2, scorecard: scorecards[m.player2.id] || m.player2.scorecard },
          }));

          if (currentStatus === 'lobby') {
            // Safe to do a full write — tournament hasn't started
            await initializeRoomTournament(roomCode, updatedCandidates, updatedMatches, 'lobby');
          } else {
            // Tournament already started — only patch scorecard data, don't touch status
            await updateScorecardsOnly(roomCode, updatedCandidates, updatedMatches);
          }
        }).catch(err => {
          console.error("[Store] Background scorecard generation failed:", err);
        });

      } catch (err: any) {
        console.error("[Store] Background pre-generation failed:", err);
      }
    },

    startTournament: async () => {
      const { roomCode, roomData } = get();
      if (!roomCode || !roomData) return;

      set({ loading: true });
      try {
        const matches = roomData.gameState.matches || [];
        const candidates = roomData.gameState.candidates || [];

        // Check if pre-generation has already finished and is saved in DB
        if (candidates.length > 0 && matches.length > 0) {
          await updateRoomStatus(roomCode, 'bracket');
          set({ loading: false });
          return;
        }

        // Fallback: If host clicks start before pre-generation finished
        await updateRoomStatus(roomCode, 'generating');

        const generatedCandidates = await generateCandidates(roomData.topic, roomData.bracketSize as (8 | 16));
        if (!generatedCandidates || generatedCandidates.length === 0) {
          throw new Error("No candidates generated.");
        }

        const shuffled = [...generatedCandidates].sort(() => Math.random() - 0.5);
        const initialMatches: Match[] = [];
        const matchCount = roomData.bracketSize / 2;

        for (let i = 0; i < matchCount; i++) {
          initialMatches.push({
            id: `r1-m${i}`,
            round: 1,
            matchIndex: i,
            player1: shuffled[i * 2],
            player2: shuffled[i * 2 + 1],
          });
        }

        await initializeRoomTournament(roomCode, shuffled, initialMatches, 'bracket');
        set({ loading: false });
      } catch (err: any) {
        console.error("[Store] Error starting tournament:", err);
        set({ error: err.message || "Failed to start tournament.", loading: false });
        await updateRoomStatus(roomCode, 'lobby'); // Reset status back to lobby on error
      }
    },

    submitVote: async (candidateId) => {
      const { roomCode } = get();
      if (!roomCode) return;
      try {
        await submitVoteInFirestore(roomCode, candidateId);
      } catch (err: any) {
        set({ error: err.message || "Failed to submit vote." });
      }
    },

    advanceMatch: async () => {
      const { roomCode } = get();
      if (!roomCode) return;

      // Fix 3: Use transactional advanceMatch that re-reads from Firestore
      await advanceMatchInFirestore(roomCode, (currentData: RoomData) => {
        const { matches, currentRound, currentMatchIndex, activeMatchVotes } = currentData.gameState;
        const bracketSize = currentData.bracketSize;

        // Find current match
        const currentMatch = matches.find(
          (m: any) => m.round === currentRound && m.matchIndex === currentMatchIndex
        );
        if (!currentMatch) return null;

        // Guard: if match already has a winner, skip (prevents double-advance)
        if (currentMatch.winner) return null;

        // Determine winner based on vote counts
        let p1Votes = 0;
        let p2Votes = 0;
        Object.values(activeMatchVotes).forEach((voteId: any) => {
          if (voteId === currentMatch.player1.id) p1Votes++;
          if (voteId === currentMatch.player2.id) p2Votes++;
        });

        let winner = currentMatch.player1;
        if (p2Votes > p1Votes) {
          winner = currentMatch.player2;
        } else if (p1Votes === p2Votes) {
          winner = Math.random() > 0.5 ? currentMatch.player1 : currentMatch.player2;
        }

        // Update current match winner
        const updatedMatches = matches.map((m: any) =>
          m.id === currentMatch.id ? { ...m, winner } : m
        );

        // Check if round is complete
        const currentRoundMatches = updatedMatches.filter((m: any) => m.round === currentRound);
        const isRoundComplete = currentRoundMatches.every((m: any) => m.winner);

        if (isRoundComplete) {
          const totalRounds = Math.log2(bracketSize);
          if (currentRound === totalRounds) {
            return { nextMatches: updatedMatches, nextRound: currentRound, nextMatchIndex: currentMatchIndex, newPhase: 'winner' as const };
          } else {
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

            return {
              nextMatches: [...updatedMatches, ...newMatches],
              nextRound,
              nextMatchIndex: 0,
              newPhase: 'bracket' as const
            };
          }
        } else {
          return {
            nextMatches: updatedMatches,
            nextRound: currentRound,
            nextMatchIndex: currentMatchIndex + 1
          };
        }
      });
    },

    startVoting: async () => {
      const { roomCode } = get();
      if (!roomCode) return;
      try {
        await startVotingInFirestore(roomCode);
      } catch (err: any) {
        console.error("[Store] Error during startVoting:", err);
        set({ error: err.message || "Failed to start voting." });
      }
    },

    extendTimer: async () => {
      const { roomCode, roomData } = get();
      if (!roomCode || !roomData?.gameState.timerStart) return;
      try {
        await extendTimerInFirestore(roomCode, roomData.gameState.timerStart);
      } catch (err: any) {
        console.error("[Store] Error during extendTimer:", err);
        set({ error: err.message || "Failed to extend timer." });
      }
    },

    resetMultiplayer: () => {
      const { roomCode, isHost, participants } = get();

      // Fix 7: Handle host transfer or room closure before disconnecting
      if (roomCode) {
        if (isHost) {
          const otherParticipants = participants.filter(p => p.id !== getPlayerId());
          if (otherParticipants.length > 0) {
            // Transfer host to next participant
            const nextHost = otherParticipants[0];
            transferHost(roomCode, nextHost.id).catch(err => {
              console.error("[Store] Failed to transfer host:", err);
            });
          } else {
            // No other participants — close the room
            closeRoom(roomCode).catch(err => {
              console.error("[Store] Failed to close room:", err);
            });
          }
        }
      }

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      set({
        isMultiplayer: false,
        roomCode: null,
        isHost: false,
        participants: [],
        roomData: null,
        loading: false,
        error: null
      });
    }
  };
});
