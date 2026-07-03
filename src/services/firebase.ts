import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  arrayUnion,
  runTransaction
} from 'firebase/firestore';

// Double-voting prevention: Get or create local device UUID
export const getPlayerId = (): string => {
  let id = localStorage.getItem('brackets_player_id');
  if (!id) {
    id = 'p-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('brackets_player_id', id);
  }
  return id;
};

// Check if Firebase variables exist
const hasFirebaseConfig = 
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Fallback warning in console if Firebase config is missing
if (!hasFirebaseConfig) {
  console.warn(
    "Firebase environment variables are missing. " +
    "Please check your .env.local file. Multiplayer mode will not function correctly without Firebase."
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Generate 4-letter uppercase code
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export interface RoomParticipant {
  id: string;
  name: string;
}

export interface RoomData {
  roomCode: string;
  topic: string;
  bracketSize: number;
  status: 'lobby' | 'generating' | 'bracket' | 'voting' | 'winner' | 'closed';
  hostId: string;
  settings: {
    autoAdvance: boolean;
    maxPlayers: number;
  };
  participants: RoomParticipant[];
  gameState: {
    candidates: any[];
    matches: any[];
    currentRound: number;
    currentMatchIndex: number;
    activeMatchVotes: Record<string, string>; // playerId -> candidateId
    timerStart?: number;
  };
}

/**
 * Creates a new multiplayer room document in Firestore.
 */
export const createRoomInFirestore = async (
  topic: string, 
  bracketSize: number, 
  autoAdvance: boolean
): Promise<string> => {
  console.log("[Firebase] Starting createRoomInFirestore...", { topic, bracketSize, autoAdvance, hasFirebaseConfig });
  if (!hasFirebaseConfig) {
    console.error("[Firebase] Missing configuration!");
    throw new Error("FIREBASE_MISSING");
  }

  const roomCode = generateRoomCode();
  const hostId = getPlayerId();
  console.log("[Firebase] Generated details:", { roomCode, hostId });

  const roomRef = doc(db, 'rooms', roomCode);
  const initialRoom: RoomData = {
    roomCode,
    topic,
    bracketSize,
    status: 'lobby',
    hostId,
    settings: {
      autoAdvance,
      maxPlayers: 10
    },
    participants: [],
    gameState: {
      candidates: [],
      matches: [],
      currentRound: 1,
      currentMatchIndex: 0,
      activeMatchVotes: {}
    }
  };

  try {
    console.log("[Firebase] Attempting setDoc for room:", roomCode);
    await setDoc(roomRef, initialRoom);
    console.log("[Firebase] setDoc completed successfully.");
    return roomCode;
  } catch (error) {
    console.error("[Firebase] Error in setDoc:", error);
    throw error;
  }
};

/**
 * Joins a guest to an existing room using a transaction to respect the 10-player limit.
 */
export const joinRoomInFirestore = async (roomCode: string, playerName: string): Promise<void> => {
  console.log("[Firebase] Starting joinRoomInFirestore...", { roomCode, playerName });
  if (!hasFirebaseConfig) {
    console.error("[Firebase] Missing configuration!");
    throw new Error("FIREBASE_MISSING");
  }

  const normalizedCode = roomCode.toUpperCase().trim();
  const playerId = getPlayerId();
  const roomRef = doc(db, 'rooms', normalizedCode);

  try {
    console.log("[Firebase] Running join transaction for roomRef:", normalizedCode);
    await runTransaction(db, async (transaction) => {
      console.log("[Firebase] Transaction internal block started.");
      const roomDoc = await transaction.get(roomRef);
      console.log("[Firebase] Fetched room document inside transaction. Exists:", roomDoc.exists());
      if (!roomDoc.exists()) {
        throw new Error("ROOM_NOT_FOUND");
      }

      const data = roomDoc.data() as RoomData;
      if (data.status === 'closed') {
        throw new Error("ROOM_CLOSED");
      }
      if (data.status !== 'lobby') {
        throw new Error("GAME_IN_PROGRESS");
      }

      const alreadyJoined = data.participants.some(p => p.id === playerId);
      console.log("[Firebase] Player join status:", { alreadyJoined, playerId });

      if (alreadyJoined) {
        const updatedParticipants = data.participants.map(p => 
          p.id === playerId ? { ...p, name: playerName } : p
        );
        console.log("[Firebase] Player already in lobby. Updating name:", playerName);
        transaction.update(roomRef, { participants: updatedParticipants });
        return;
      }

      if (data.participants.length >= (data.settings.maxPlayers || 10)) {
        console.warn("[Firebase] Room full. Capacity count:", data.participants.length);
        throw new Error("ROOM_FULL");
      }

      const newParticipant = { id: playerId, name: playerName };
      console.log("[Firebase] Adding new participant to room array:", newParticipant);
      transaction.update(roomRef, {
        participants: arrayUnion(newParticipant)
      });
    });
    console.log("[Firebase] Join transaction successfully completed.");
  } catch (error) {
    console.error("[Firebase] Error in join transaction:", error);
    throw error;
  }
};

/**
 * Subscribes to real-time changes of a room.
 */
export const listenToRoomInFirestore = (
  roomCode: string, 
  onUpdate: (data: RoomData) => void,
  onError: (err: any) => void
) => {
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
  return onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as RoomData);
    } else {
      onError(new Error("ROOM_NOT_FOUND"));
    }
  }, onError);
};

/**
 * Updates the game state to 'generating' or directly modifies status.
 */
export const updateRoomStatus = async (roomCode: string, status: RoomData['status']) => {
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
  await updateDoc(roomRef, { status });
};

/**
 * Starts voting by shifting status to 'voting', clearing votes, and setting timerStart to now.
 */
export const startVotingInFirestore = async (roomCode: string) => {
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
  await updateDoc(roomRef, {
    status: 'voting',
    'gameState.activeMatchVotes': {},
    'gameState.timerStart': Date.now()
  });
};

/**
 * Initialize tournament components once generated.
 */
export const initializeRoomTournament = async (
  roomCode: string,
  candidates: any[],
  matches: any[],
  status: RoomData['status'] = 'bracket'
) => {
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
  await updateDoc(roomRef, {
    status,
    'gameState.candidates': candidates,
    'gameState.matches': matches,
    'gameState.currentRound': 1,
    'gameState.currentMatchIndex': 0,
    'gameState.activeMatchVotes': {},
    'gameState.timerStart': Date.now()
  });
};

/**
 * Submits a vote for the current matchup.
 */
export const submitVoteInFirestore = async (roomCode: string, candidateId: string) => {
  const playerId = getPlayerId();
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());

  await updateDoc(roomRef, {
    [`gameState.activeMatchVotes.${playerId}`]: candidateId
  });
};

/**
 * Advances the active match using a Firestore transaction to prevent stale reads.
 * The computeFn receives the latest room data and returns the update payload.
 */
export const advanceMatchInFirestore = async (
  roomCode: string,
  computeFn: (currentData: RoomData) => { 
    nextMatches: any[]; 
    nextRound: number; 
    nextMatchIndex: number; 
    newPhase?: RoomData['status'];
  } | null
) => {
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
  
  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists()) {
      throw new Error("ROOM_NOT_FOUND");
    }

    const currentData = roomDoc.data() as RoomData;
    const result = computeFn(currentData);
    
    // If computeFn returns null, skip the write (e.g., match already advanced)
    if (!result) return;

    const updates: any = {
      'gameState.matches': result.nextMatches,
      'gameState.currentRound': result.nextRound,
      'gameState.currentMatchIndex': result.nextMatchIndex,
      'gameState.activeMatchVotes': {},
      'gameState.timerStart': Date.now()
    };

    if (result.newPhase) {
      updates.status = result.newPhase;
    }

    transaction.update(roomRef, updates);
  });
};

/**
 * Closes a room by setting its status to 'closed'.
 */
export const closeRoom = async (roomCode: string) => {
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
  await updateDoc(roomRef, { status: 'closed' });
};

/**
 * Transfers host privileges to another participant.
 */
export const transferHost = async (roomCode: string, newHostId: string) => {
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
  await updateDoc(roomRef, { hostId: newHostId });
};

/**
 * Updates only the scorecard data on candidates and matches without touching status.
 * Used by background pre-generation to safely enrich data even if the room has moved past lobby.
 */
export const updateScorecardsOnly = async (
  roomCode: string,
  candidates: any[],
  matches: any[]
) => {
  const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
  await updateDoc(roomRef, {
    'gameState.candidates': candidates,
    'gameState.matches': matches
  });
};
