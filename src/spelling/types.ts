export const CATEGORIES = [
  'Bay & Beyond',
  'Internet Brain',
  'Passport Stamps',
  'Sound & Screen',
  'Words That Sound Fake',
  "Dealer's Choice",
] as const

export type Category = (typeof CATEGORIES)[number]
export type Difficulty = 'warmup' | 'tricky' | 'menace'
export type Hint = 'definition' | 'origin' | 'sentence'

export interface WordCard {
  id: string
  word: string
  pronunciation: string
  definition: string
  origin: string
  sentence: string
  category: Exclude<Category, "Dealer's Choice">
  difficulty: Difficulty
}

export interface Player {
  id: string
  name: string
  score: number
  turns: number
  isGuest?: boolean
}

export interface TurnRecord {
  turnId: string
  playerId: string
  wordId: string
  category: Category
  round: number
  correct: boolean
  points: number
}

export interface CurrentTurn {
  turnId: string
  playerId: string
  judgeId?: string
  category: Category | null
  wordId: string | null
  requestedHints: Hint[]
  ruling: 'correct' | 'incorrect' | null
}

export interface SpellingRoom {
  roomCode: string
  title: string
  hostId: string
  status: 'lobby' | 'playing' | 'finished' | 'closed'
  players: Player[]
  playerOrder: string[]
  turnIndex: number
  currentTurn: CurrentTurn | null
  history: TurnRecord[]
  usedWordIds: string[]
  revision: number
  createdAt: number
  updatedAt: number
}
