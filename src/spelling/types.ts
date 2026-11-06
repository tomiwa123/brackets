export const CATEGORIES = [
  'Bay & Beyond',
  'Internet Brain',
  'Passport Stamps',
  'Sound & Screen',
  'Science & Nature',
  "Dealer's Choice",
] as const

export type Category = (typeof CATEGORIES)[number]
export type Difficulty = 'warmup' | 'tricky' | 'menace'
export type Hint = 'definition' | 'origin' | 'sentence'
export type GameMode = 'classic' | 'team'
export type TeamId = 'honey' | 'blue'
export type ReplayChoice = 'same' | 'shuffle' | 'setup'
export type FaceOffKind = 'round' | 'tiebreak'
export type FaceOffStatus = 'ready' | 'open' | 'attempt' | 'steal' | 'category'

export interface WordCard {
  id: string
  word: string
  pronunciation: string
  definition: string
  origin: string
  sentence: string
  category: Exclude<Category, "Dealer's Choice">
  difficulty: Difficulty
  teamSelectionWeight?: 0 | 1 | 2
}

export interface Player {
  id: string
  name: string
  score: number
  turns: number
  isGuest?: boolean
  teamId?: TeamId
}

export interface Team {
  id: TeamId
  name: string
  color: string
  score: number
  saveTokensUsed: number[]
}

export interface TurnRecord {
  turnId: string
  playerId: string
  wordId: string
  category: Category
  round: number
  correct: boolean
  points: number
  teamId?: TeamId
  saved?: boolean
  isPremium?: boolean
  basePoints?: number
  bonusPoints?: number
}

export interface CurrentTurn {
  turnId: string
  playerId: string
  judgeId?: string
  category: Category | null
  wordId: string | null
  spellingStartedAt?: number
  requestedHints: Hint[]
  ruling: 'correct' | 'incorrect' | 'saved' | null
  saveActive?: boolean
  saveEndsAt?: number
  saveDeclined?: boolean
  isPremium?: boolean
  basePoints?: number
  bonusPoints?: number
}

export interface PremiumBank {
  round: number
  startPoints: number
  remainingPoints: number
  controllingTeamId: TeamId
  carriedCategory: Category
  selectedPlayerId?: string | null
}

export interface FaceOff {
  id: string
  kind: FaceOffKind
  round: number
  status: FaceOffStatus
  representativeIds: string[]
  judgeId: string
  category: Category
  categoryOptions: Category[]
  wordId: string
  buzzedPlayerId?: string
  attemptPlayerId?: string
  attemptStartedAt?: number
  winnerPlayerId?: string
  winnerTeamId?: TeamId
}

export interface FaceOffRecord {
  id: string
  kind: FaceOffKind
  round: number
  representativeIds: string[]
  category: Category
  wordId: string
  winnerPlayerId?: string
  winnerTeamId?: TeamId
  points?: number
}

export interface SpellingRoom {
  roomCode: string
  title: string
  hostId: string
  temporaryHostId?: string
  mode: GameMode
  teams: Team[]
  status: 'lobby' | 'playing' | 'finished' | 'closed'
  players: Player[]
  playerOrder: string[]
  turnIndex: number
  currentTurn: CurrentTurn | null
  faceOff: FaceOff | null
  faceOffHistory: FaceOffRecord[]
  faceOffRotationOffset: number
  premiumBank: PremiumBank | null
  roundUsedPlayerIds: string[]
  openingCategory: Category | null
  history: TurnRecord[]
  usedWordIds: string[]
  revision: number
  createdAt: number
  updatedAt: number
}
