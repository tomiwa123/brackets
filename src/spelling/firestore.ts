import { doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../services/firebase'
import { drawWord, eligibleTemporaryJudges, judgeIdForPlayer, judgeIdForTurn, makeTurn, nextTurn, pointsForRound, roundForTurn } from './gameEngine'
import type { Category, Hint, SpellingRoom } from './types'
import { WORD_BANK } from './words'

const COLLECTION = 'spellingRooms'
const PLAYER_KEY = 'spelling-night-player-id'
const SESSION_KEY = 'spelling-night-session'

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
}

export function getSpellingPlayerId(): string {
  let id = localStorage.getItem(PLAYER_KEY)
  if (!id) {
    id = randomId('player')
    localStorage.setItem(PLAYER_KEY, id)
  }
  return id
}

export function rememberSession(roomCode: string, name: string): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, name }))
}

export function getRememberedSession(): { roomCode: string; name: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as unknown
    if (!value || typeof value !== 'object') return null
    const session = value as { roomCode?: unknown; name?: unknown }
    return typeof session.roomCode === 'string' && typeof session.name === 'string'
      ? { roomCode: session.roomCode, name: session.name }
      : null
  } catch {
    return null
  }
}

function assertFirebase(): void {
  if (!hasFirebaseConfig) throw new Error('Multiplayer is not configured on this site.')
}

function codeFromPath(): string | null {
  const match = window.location.pathname.match(/^\/spelling\/join\/([a-z]{4})/i)
  return match?.[1]?.toUpperCase() ?? null
}

export const joinCodeFromPath = codeFromPath()

function makeCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
}

export async function createSpellingRoom(hostName: string): Promise<string> {
  assertFirebase()
  const hostId = getSpellingPlayerId()
  let code = makeCode()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomRef = doc(db, COLLECTION, code)
    if (!(await getDoc(roomRef)).exists()) {
      const now = Date.now()
      const room: SpellingRoom = {
        roomCode: code,
        title: 'Spelling bee game night',
        hostId,
        status: 'lobby',
        players: [{ id: hostId, name: hostName.trim(), score: 0, turns: 0 }],
        playerOrder: [hostId],
        turnIndex: 0,
        currentTurn: null,
        history: [],
        usedWordIds: [],
        revision: 0,
        createdAt: now,
        updatedAt: now,
      }
      await setDoc(roomRef, room)
      rememberSession(code, hostName.trim())
      return code
    }
    code = makeCode()
  }
  throw new Error('Could not create a unique room. Please try again.')
}

type Mutation = (room: SpellingRoom) => SpellingRoom

async function mutate(code: string, mutation: Mutation): Promise<void> {
  assertFirebase()
  const roomRef = doc(db, COLLECTION, code.toUpperCase())
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(roomRef)
    if (!snapshot.exists()) throw new Error('ROOM_NOT_FOUND')
    const room = snapshot.data() as SpellingRoom
    const updated = mutation(room)
    transaction.set(roomRef, {
      ...updated,
      roomCode: room.roomCode,
      createdAt: room.createdAt,
      revision: room.revision + 1,
      updatedAt: Date.now(),
    })
  })
}

export async function joinSpellingRoom(code: string, name: string): Promise<void> {
  const normalized = code.trim().toUpperCase()
  const playerId = getSpellingPlayerId()
  await mutate(normalized, (room) => {
    if (room.status !== 'lobby') throw new Error('GAME_STARTED')
    const existing = room.players.find((player) => player.id === playerId)
    if (existing) {
      return {
        ...room,
        players: room.players.map((player) => player.id === playerId ? { ...player, name: name.trim() } : player),
      }
    }
    if (room.players.length >= 10) throw new Error('ROOM_FULL')
    if (room.players.some((player) => player.name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error('NAME_TAKEN')
    }
    return {
      ...room,
      players: [...room.players, { id: playerId, name: name.trim(), score: 0, turns: 0 }],
      playerOrder: [...room.playerOrder, playerId],
    }
  })
  rememberSession(normalized, name.trim())
}

export function listenToSpellingRoom(
  code: string,
  onRoom: (room: SpellingRoom) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, COLLECTION, code.toUpperCase()),
    (snapshot) => snapshot.exists() ? onRoom(snapshot.data() as SpellingRoom) : onError('Room not found.'),
    () => onError('Connection lost. Trying to reconnect…'),
  )
}

function requireHost(room: SpellingRoom, actorId: string): void {
  if (room.hostId !== actorId) throw new Error('HOST_ONLY')
}

export async function addGuest(code: string, actorId: string, name: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (room.status !== 'lobby') throw new Error('GAME_STARTED')
    if (room.players.length >= 10) throw new Error('ROOM_FULL')
    if (room.players.some((player) => player.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('NAME_TAKEN')
    const guestId = randomId('guest')
    return {
      ...room,
      players: [...room.players, { id: guestId, name: name.trim(), score: 0, turns: 0, isGuest: true }],
      playerOrder: [...room.playerOrder, guestId],
    }
  })
}

export async function startSpellingGame(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (room.players.length < 2) throw new Error('NEED_PLAYERS')
    if (eligibleTemporaryJudges(room).length === 0) throw new Error('NEED_JUDGE')
    const firstPlayerId = room.playerOrder[0]
    return {
      ...room,
      status: 'playing',
      turnIndex: 0,
      currentTurn: makeTurn(firstPlayerId, room.revision + 1, judgeIdForPlayer(room, firstPlayerId)),
    }
  })
}

export async function reassignJudge(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const turn = room.currentTurn
    if (!turn || turn.playerId !== room.hostId || turn.wordId) return room
    const candidates = eligibleTemporaryJudges(room)
    if (candidates.length < 2) return room
    const currentJudgeId = judgeIdForTurn(room)
    const currentIndex = candidates.findIndex((player) => player.id === currentJudgeId)
    const judgeId = candidates[(currentIndex + 1) % candidates.length].id
    return { ...room, currentTurn: { ...turn, judgeId } }
  })
}

export async function chooseCategory(code: string, actorId: string, category: Category): Promise<void> {
  await mutate(code, (room) => {
    const turn = room.currentTurn
    if (!turn || room.status !== 'playing' || turn.wordId) return room
    if (actorId !== room.hostId && actorId !== turn.playerId) throw new Error('NOT_YOUR_TURN')
    const difficulty = roundForTurn(room.turnIndex, room.playerOrder.length)
    const word = drawWord(WORD_BANK, category, difficulty === 1 ? 'warmup' : difficulty === 2 ? 'tricky' : 'menace', room.usedWordIds)
    return {
      ...room,
      currentTurn: { ...turn, category, wordId: word.id },
      usedWordIds: [...room.usedWordIds, word.id],
    }
  })
}

export async function requestHint(code: string, actorId: string, hint: Hint): Promise<void> {
  await mutate(code, (room) => {
    const turn = room.currentTurn
    if (!turn || !turn.wordId || (actorId !== room.hostId && actorId !== turn.playerId)) return room
    return turn.requestedHints.includes(hint)
      ? room
      : { ...room, currentTurn: { ...turn, requestedHints: [...turn.requestedHints, hint] } }
  })
}

export async function judgeTurn(code: string, actorId: string, correct: boolean): Promise<void> {
  await mutate(code, (room) => {
    if (judgeIdForTurn(room) !== actorId) throw new Error('JUDGE_ONLY')
    const turn = room.currentTurn
    if (!turn?.wordId || !turn.category || turn.ruling) return room
    const round = roundForTurn(room.turnIndex, room.playerOrder.length)
    const points = correct ? pointsForRound(round) : 0
    return {
      ...room,
      currentTurn: { ...turn, ruling: correct ? 'correct' : 'incorrect' },
      players: room.players.map((player) => player.id === turn.playerId
        ? { ...player, score: player.score + points, turns: player.turns + 1 }
        : player),
      history: [...room.history, {
        turnId: turn.turnId,
        playerId: turn.playerId,
        wordId: turn.wordId,
        category: turn.category,
        round,
        correct,
        points,
      }],
    }
  })
}

export async function undoRuling(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    if (judgeIdForTurn(room) !== actorId) throw new Error('JUDGE_ONLY')
    const turn = room.currentTurn
    const record = room.history.at(-1)
    if (!turn?.ruling || !record || record.turnId !== turn.turnId) return room
    return {
      ...room,
      currentTurn: { ...turn, ruling: null },
      players: room.players.map((player) => player.id === record.playerId
        ? { ...player, score: player.score - record.points, turns: Math.max(0, player.turns - 1) }
        : player),
      history: room.history.slice(0, -1),
    }
  })
}

export async function skipWord(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    if (judgeIdForTurn(room) !== actorId) throw new Error('JUDGE_ONLY')
    const turn = room.currentTurn
    if (!turn?.category || turn.ruling) return room
    const round = roundForTurn(room.turnIndex, room.playerOrder.length)
    const difficulty = round === 1 ? 'warmup' : round === 2 ? 'tricky' : 'menace'
    const word = drawWord(WORD_BANK, turn.category, difficulty, room.usedWordIds)
    return {
      ...room,
      currentTurn: { ...turn, wordId: word.id, requestedHints: [] },
      usedWordIds: [...room.usedWordIds, word.id],
    }
  })
}

export async function advanceTurn(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (!room.currentTurn?.ruling) return room
    return { ...room, ...nextTurn(room) }
  })
}

export async function replayRoom(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    return {
      ...room,
      status: 'lobby',
      players: room.players.map((player) => ({ ...player, score: 0, turns: 0 })),
      turnIndex: 0,
      currentTurn: null,
      history: [],
      usedWordIds: [],
    }
  })
}
