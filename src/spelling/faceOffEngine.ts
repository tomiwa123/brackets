import {
  activeHostId,
  difficultyForRound,
  drawWord,
  faceOffPoints,
  faceOffRepresentativeIds,
  playersInOrder,
  startingPremiumBank,
} from './gameEngine'
import { CATEGORIES } from './types'
import type {
  Category,
  FaceOff,
  FaceOffKind,
  FaceOffRecord,
  FaceOffRulingUndo,
  FaceOffSnapshot,
  FaceOffVoidReason,
  SpellingRoom,
  WordCard,
} from './types'
import { WORD_BANK } from './words'

const FACE_OFF_CATEGORIES = CATEGORIES.filter((category) => category !== "Dealer's Choice")

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
}

function snapshotFaceOff(faceOff: FaceOff): FaceOffSnapshot {
  const snapshot = { ...faceOff }
  delete snapshot.lastRuling
  return snapshot
}

function captureUndo(room: SpellingRoom, faceOff: FaceOff): FaceOffRulingUndo {
  return {
    faceOff: snapshotFaceOff(faceOff),
    teams: room.teams.map((team) => ({ ...team, saveTokensUsed: [...team.saveTokensUsed] })),
    faceOffHistory: room.faceOffHistory.map((record) => ({ ...record, representativeIds: [...record.representativeIds] })),
    premiumBank: room.premiumBank ? { ...room.premiumBank } : null,
    status: room.status,
    usedWordIds: [...room.usedWordIds],
  }
}

function appendFaceOffRecord(history: FaceOffRecord[], record: FaceOffRecord): FaceOffRecord[] {
  return [...history, record].slice(-20)
}

function availableCategories(
  bank: WordCard[],
  round: number,
  usedWordIds: string[],
  excluded?: Category,
): Category[] {
  const difficulty = difficultyForRound(round)
  return FACE_OFF_CATEGORIES.filter((category) => category !== excluded && bank.some((card) =>
    card.category === category && card.difficulty === difficulty && !usedWordIds.includes(card.id),
  ))
}

function faceOffJudgeId(room: SpellingRoom, representativeIds: string[]): string {
  const activeHost = activeHostId(room)
  if (!representativeIds.includes(activeHost)) return activeHost
  return playersInOrder(room.players, room.playerOrder).find((player) =>
    player.id !== activeHost
    && (!room.temporaryHostId || player.id !== room.hostId)
    && !player.isGuest
    && !representativeIds.includes(player.id),
  )?.id ?? activeHost
}

function drawExactFaceOffWord(
  bank: WordCard[],
  category: Category,
  round: number,
  usedWordIds: string[],
  random: () => number,
): WordCard | null {
  try {
    return drawWord(bank, category, difficultyForRound(round), usedWordIds, {
      mode: 'team',
      strictCategory: true,
      random,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'WORD_CATEGORY_EXHAUSTED') return null
    throw error
  }
}

interface NewFaceOffOptions {
  category?: Category
  representativeIds?: string[]
  judgeId?: string
  notice?: string
  random?: () => number
  bank?: WordCard[]
}

export function createFaceOffState(
  room: SpellingRoom,
  round: number,
  kind: FaceOffKind,
  options: NewFaceOffOptions = {},
): Pick<SpellingRoom, 'faceOff' | 'usedWordIds'> {
  const bank = options.bank ?? WORD_BANK
  const random = options.random ?? Math.random
  const tiebreakCount = room.faceOffHistory.filter((record) => record.kind === 'tiebreak').length
  const sequence = kind === 'round'
    ? room.faceOffRotationOffset + round - 1
    : room.faceOffRotationOffset + 3 + tiebreakCount
  const representativeIds = options.representativeIds
    ?? faceOffRepresentativeIds(playersInOrder(room.players, room.playerOrder), sequence)
  const category = options.category ?? FACE_OFF_CATEGORIES[sequence % FACE_OFF_CATEGORIES.length]
  const word = drawExactFaceOffWord(bank, category, round, room.usedWordIds, random)
  const alternatives = availableCategories(bank, round, room.usedWordIds, category)
  const faceOff: FaceOff = {
    id: makeId('faceoff'),
    kind,
    round,
    status: word ? 'ready' : 'exhausted',
    representativeIds,
    judgeId: options.judgeId ?? faceOffJudgeId(room, representativeIds),
    category,
    categoryOptions: alternatives,
    wordId: word?.id ?? null,
    ...(options.notice ? { notice: options.notice } : {}),
  }
  return {
    faceOff,
    usedWordIds: word ? [...room.usedWordIds, word.id] : room.usedWordIds,
  }
}

function recordFor(
  faceOff: FaceOff,
  outcome: FaceOffRecord['outcome'],
  reason?: FaceOffRecord['reason'],
  points = 0,
): FaceOffRecord {
  if (!faceOff.wordId) throw new Error('FACE_OFF_WORD_REQUIRED')
  return {
    id: faceOff.id,
    kind: faceOff.kind,
    round: faceOff.round,
    representativeIds: faceOff.representativeIds,
    category: faceOff.category,
    wordId: faceOff.wordId,
    points,
    outcome,
    ...(reason ? { reason } : {}),
  }
}

const VOID_MESSAGES: Record<FaceOffVoidReason, string> = {
  'no-buzz': 'No buzz — a fresh word is ready.',
  replacement: 'Word replaced — no result.',
  substitution: 'Representative changed — the previous word is void.',
  technical: 'Technical reset — a fresh word is ready.',
}

export function replaceFaceOffWordState(
  room: SpellingRoom,
  reason: FaceOffVoidReason,
  options: NewFaceOffOptions = {},
): SpellingRoom {
  const faceOff = room.faceOff
  if (!faceOff || !faceOff.wordId) return room
  const history = appendFaceOffRecord(room.faceOffHistory, recordFor(faceOff, 'void', reason))
  const recorded = { ...room, faceOffHistory: history }
  const patch = createFaceOffState(recorded, faceOff.round, faceOff.kind, {
    ...options,
    category: options.category ?? faceOff.category,
    representativeIds: options.representativeIds ?? faceOff.representativeIds,
    judgeId: options.judgeId ?? faceOff.judgeId,
    notice: options.notice ?? VOID_MESSAGES[reason],
  })
  return { ...recorded, ...patch }
}

export function chooseExhaustedFaceOffCategoryState(
  room: SpellingRoom,
  category: Category,
  options: Pick<NewFaceOffOptions, 'bank' | 'random'> = {},
): SpellingRoom {
  const faceOff = room.faceOff
  if (!faceOff || faceOff.status !== 'exhausted' || !faceOff.categoryOptions.includes(category)) return room
  const patch = createFaceOffState(room, faceOff.round, faceOff.kind, {
    ...options,
    category,
    representativeIds: faceOff.representativeIds,
    judgeId: faceOff.judgeId,
    notice: `${category} selected — a fresh face-off word is ready.`,
  })
  return { ...room, ...patch }
}

export function applyFaceOffRulingState(
  room: SpellingRoom,
  correct: boolean,
  options: Pick<NewFaceOffOptions, 'bank' | 'random'> = {},
): SpellingRoom {
  const faceOff = room.faceOff
  if (!faceOff || !faceOff.wordId || (faceOff.status !== 'attempt' && faceOff.status !== 'steal') || !faceOff.attemptPlayerId) {
    return room
  }
  const undo = captureUndo(room, faceOff)
  const attemptPlayer = room.players.find((player) => player.id === faceOff.attemptPlayerId)
  const winnerTeamId = attemptPlayer?.teamId

  if (correct && attemptPlayer && winnerTeamId) {
    const points = faceOffPoints(faceOff.round, faceOff.kind)
    const record: FaceOffRecord = {
      ...recordFor(faceOff, 'winner', undefined, points),
      winnerPlayerId: attemptPlayer.id,
      winnerTeamId,
    }
    const premiumBank = faceOff.kind === 'round' ? {
      round: faceOff.round,
      startPoints: startingPremiumBank(faceOff.round, room.players.length),
      remainingPoints: startingPremiumBank(faceOff.round, room.players.length),
      controllingTeamId: winnerTeamId,
      carriedCategory: faceOff.category,
      attemptedPlayerIds: [],
      selectedPlayerId: null,
    } : room.premiumBank
    return {
      ...room,
      faceOff: {
        ...faceOff,
        status: 'result',
        outcome: 'winner',
        winnerPlayerId: attemptPlayer.id,
        winnerTeamId,
        notice: `${attemptPlayer.name} wins the face-off for ${points} ${points === 1 ? 'point' : 'points'}.`,
        lastRuling: undo,
      },
      premiumBank,
      currentTurn: null,
      roundUsedPlayerIds: [],
      teams: room.teams.map((team) => team.id === winnerTeamId ? { ...team, score: team.score + points } : team),
      faceOffHistory: appendFaceOffRecord(room.faceOffHistory, record),
    }
  }

  if (faceOff.status === 'attempt') {
    const stealPlayerId = faceOff.representativeIds.find((playerId) => playerId !== faceOff.attemptPlayerId)
    return {
      ...room,
      faceOff: {
        ...faceOff,
        status: 'steal',
        attemptPlayerId: stealPlayerId,
        attemptStartedAt: Date.now(),
        notice: 'First attempt missed — the other representative may steal.',
        lastRuling: undo,
      },
    }
  }

  const history = appendFaceOffRecord(room.faceOffHistory, recordFor(faceOff, 'double-miss', 'double-miss'))
  const recorded = { ...room, faceOffHistory: history }
  const patch = createFaceOffState(recorded, faceOff.round, faceOff.kind, {
    ...options,
    category: faceOff.category,
    representativeIds: faceOff.kind === 'round' ? faceOff.representativeIds : undefined,
    judgeId: faceOff.kind === 'round' ? faceOff.judgeId : undefined,
    notice: 'No winner on that word — score stays unchanged and a fresh word is ready.',
  })
  return {
    ...recorded,
    ...patch,
    faceOff: patch.faceOff ? { ...patch.faceOff, lastRuling: undo } : null,
  }
}

export function undoFaceOffRulingState(room: SpellingRoom): SpellingRoom {
  const undo = room.faceOff?.lastRuling
  if (!undo) return room
  return {
    ...room,
    faceOff: { ...undo.faceOff },
    teams: undo.teams.map((team) => ({ ...team, saveTokensUsed: [...team.saveTokensUsed] })),
    faceOffHistory: undo.faceOffHistory.map((record) => ({ ...record, representativeIds: [...record.representativeIds] })),
    premiumBank: undo.premiumBank ? { ...undo.premiumBank } : null,
    status: undo.status,
    usedWordIds: [...undo.usedWordIds],
  }
}

export function continueFaceOffResultState(room: SpellingRoom): SpellingRoom {
  const faceOff = room.faceOff
  if (!faceOff || faceOff.status !== 'result' || faceOff.outcome !== 'winner') return room
  return {
    ...room,
    faceOff: null,
    status: faceOff.kind === 'tiebreak' ? 'finished' : room.status,
  }
}

export function clearFaceOffRecoveryState(faceOff: FaceOff): FaceOff {
  const cleared = { ...faceOff }
  delete cleared.notice
  delete cleared.lastRuling
  return cleared
}
