export interface ScorecardAttribute {
    label: string;
    value: string | string[];
    sentiment: 'positive' | 'negative' | 'neutral';
}

export interface Scorecard {
    battleCry: string;
    bio: string;
    attributes: ScorecardAttribute[];
}

export interface Candidate {
    id: string;
    name: string;
    bio: string;
    seed: number;
    imageUrl?: string; // Optional for now
    scorecard?: Scorecard;
    isLoading?: boolean;
}

export interface Match {
    id: string;
    round: number; // 1 = Round of 16, 2 = Quarterfinals, 3 = Semifinals, 4 = Final
    matchIndex: number; // 0-7 for round 1, etc.
    player1: Candidate;
    player2: Candidate;
    winner?: Candidate;
}

export type GamePhase = 'input' | 'bracket' | 'voting' | 'winner';

export interface GameState {
    topic: string;
    candidates: Candidate[];
    matches: Match[];
    currentMatchIndex: number; // Index in the current round's matches
    currentRound: number;
    phase: GamePhase;

    // Actions
    setTopic: (topic: string) => void;
    generateBracket: () => Promise<void>;
    startVoting: () => void;
    vote: (winnerId: string) => void;
    enrichMatchup: () => Promise<void>;
    resetGame: () => void;
}
