import type { Category, CurrentTurn, Difficulty, Player, SpellingRoom, WordCard } from './types'

export const TOTAL_ROUNDS = 3
export const ROUND_LABELS = [
  'Familiar with a wrinkle',
  'Multiple plausible spellings',
  'The pronunciation betrays you',
] as const

export function roundForTurn(turnIndex: number, playerCount: number): number {
  return Math.min(TOTAL_ROUNDS, Math.floor(turnIndex / Math.max(1, playerCount)) + 1)
}

export function difficultyForRound(round: number): Difficulty {
  return round === 1 ? 'warmup' : round === 2 ? 'tricky' : 'menace'
}

export function pointsForRound(round: number): number {
  return Math.min(TOTAL_ROUNDS, Math.max(1, round))
}

export function eligibleTemporaryJudges(room: Pick<SpellingRoom, 'hostId' | 'players' | 'playerOrder'>): Player[] {
  return room.playerOrder
    .map((id) => room.players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player && player.id !== room.hostId && !player.isGuest))
}

export function judgeIdForPlayer(
  room: Pick<SpellingRoom, 'hostId' | 'players' | 'playerOrder'>,
  playerId: string,
): string | null {
  if (playerId !== room.hostId) return room.hostId
  return eligibleTemporaryJudges(room)[0]?.id ?? null
}

export function judgeIdForTurn(room: SpellingRoom): string | null {
  if (!room.currentTurn) return null
  return room.currentTurn.judgeId ?? judgeIdForPlayer(room, room.currentTurn.playerId)
}

export function makeTurn(playerId: string, revision: number, judgeId?: string | null): CurrentTurn {
  return {
    turnId: `${Date.now()}-${revision}-${playerId}`,
    playerId,
    ...(judgeId ? { judgeId } : {}),
    category: null,
    wordId: null,
    requestedHints: [],
    ruling: null,
  }
}

export function drawWord(
  bank: WordCard[],
  category: Category,
  difficulty: Difficulty,
  usedWordIds: string[],
  random = Math.random,
): WordCard {
  const unused = bank.filter((card) =>
    card.difficulty === difficulty &&
    !usedWordIds.includes(card.id) &&
    (category === "Dealer's Choice" || card.category === category),
  )
  const fallback = bank.filter((card) =>
    card.difficulty === difficulty && !usedWordIds.includes(card.id),
  )
  const pool = unused.length > 0 ? unused : fallback
  if (pool.length === 0) throw new Error('WORD_BANK_EXHAUSTED')
  return pool[Math.floor(random() * pool.length)]
}

export function rankedPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

export function nextTurn(room: SpellingRoom): Pick<SpellingRoom, 'turnIndex' | 'currentTurn' | 'status'> {
  const nextIndex = room.turnIndex + 1
  const totalTurns = room.playerOrder.length * TOTAL_ROUNDS
  if (nextIndex >= totalTurns) {
    return { turnIndex: nextIndex, currentTurn: null, status: 'finished' }
  }
  const nextPlayerId = room.playerOrder[nextIndex % room.playerOrder.length]
  return {
    turnIndex: nextIndex,
    currentTurn: makeTurn(nextPlayerId, room.revision + 1, judgeIdForPlayer(room, nextPlayerId)),
    status: 'playing',
  }
}
