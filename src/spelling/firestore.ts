import { doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../services/firebase'
import {
  alternatingTeamOrder,
  assignBalancedTeams,
  canRenameTeam,
  createDefaultTeams,
  drawWord,
  eligibleTemporaryJudges,
  faceOffRepresentativeIds,
  gameMode,
  judgeIdForPlayer,
  judgeIdForTurn,
  makeTurn,
  nextTurn,
  pointsForRound,
  rankedTeams,
  remainingSaveTokens,
  roundForTurn,
  teamForPlayer,
  validatedTeamName,
} from './gameEngine'
import { CATEGORIES } from './types'
import type { Category, FaceOff, FaceOffKind, GameMode, Hint, ReplayChoice, SpellingRoom, TeamId } from './types'
import { WORD_BANK } from './words'
import { MAX_PLAYERS } from './config'

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
export const presentationCodeFromPath = window.location.pathname.match(/^\/spelling\/present\/([a-z]{4})/i)?.[1]?.toUpperCase() ?? null

function makeCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
}

function normalizeRoom(room: SpellingRoom): SpellingRoom {
  return {
    ...room,
    mode: room.mode ?? 'classic',
    teams: (room.teams?.length ? room.teams : createDefaultTeams()).map((team) => ({
      ...team,
      score: team.score ?? 0,
      saveTokensUsed: team.saveTokensUsed?.length === 3 ? team.saveTokensUsed : [0, 0, 0],
    })),
    faceOff: room.faceOff ?? null,
    faceOffHistory: room.faceOffHistory ?? [],
    faceOffRotationOffset: room.faceOffRotationOffset ?? 0,
    openingCategory: room.openingCategory ?? null,
  }
}

const FACE_OFF_CATEGORIES = CATEGORIES.filter((category) => category !== "Dealer's Choice")

function faceOffJudgeId(room: SpellingRoom, representativeIds: string[]): string {
  if (!representativeIds.includes(room.hostId)) return room.hostId
  return room.players.find((player) =>
    player.id !== room.hostId && !player.isGuest && !representativeIds.includes(player.id),
  )?.id ?? eligibleTemporaryJudges(room)[0]?.id ?? room.hostId
}

function createFaceOff(room: SpellingRoom, round: number, kind: FaceOffKind): Pick<SpellingRoom, 'faceOff' | 'usedWordIds'> {
  const tieBreakCount = room.faceOffHistory.filter((record) => record.kind === 'tiebreak').length
  const sequence = kind === 'round' ? room.faceOffRotationOffset + round - 1 : room.faceOffRotationOffset + 3 + tieBreakCount
  const representativeIds = faceOffRepresentativeIds(room.players, sequence)
  const category = FACE_OFF_CATEGORIES[sequence % FACE_OFF_CATEGORIES.length]
  const difficulty = round === 1 ? 'warmup' : round === 2 ? 'tricky' : 'menace'
  const word = drawWord(WORD_BANK, category, difficulty, room.usedWordIds, { mode: 'team' })
  const optionStart = (sequence + 1) % CATEGORIES.length
  const categoryOptions = Array.from({ length: 3 }, (_, index) => CATEGORIES[(optionStart + index) % CATEGORIES.length])
  const faceOff: FaceOff = {
    id: randomId('faceoff'),
    kind,
    round,
    status: 'ready',
    representativeIds,
    judgeId: faceOffJudgeId(room, representativeIds),
    category,
    categoryOptions,
    wordId: word.id,
  }
  return { faceOff, usedWordIds: [...room.usedWordIds, word.id] }
}

function startRally(room: SpellingRoom, category: Category, startingTeamId: TeamId): SpellingRoom {
  const playerOrder = alternatingTeamOrder(room.players, startingTeamId)
  const firstPlayerId = playerOrder[0]
  const round = roundForTurn(room.turnIndex, playerOrder.length)
  const difficulty = round === 1 ? 'warmup' : round === 2 ? 'tricky' : 'menace'
  const word = drawWord(WORD_BANK, category, difficulty, room.usedWordIds, { mode: 'team' })
  const turn = makeTurn(firstPlayerId, room.revision + 1, judgeIdForPlayer({ ...room, playerOrder }, firstPlayerId))
  return {
    ...room,
    playerOrder,
    faceOff: null,
    openingCategory: category,
    currentTurn: { ...turn, category, wordId: word.id },
    usedWordIds: [...room.usedWordIds, word.id],
  }
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
        mode: 'classic',
        teams: createDefaultTeams(),
        status: 'lobby',
        players: [{ id: hostId, name: hostName.trim(), score: 0, turns: 0 }],
        playerOrder: [hostId],
        turnIndex: 0,
        currentTurn: null,
        faceOff: null,
        faceOffHistory: [],
        faceOffRotationOffset: 0,
        openingCategory: null,
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
    const room = normalizeRoom(snapshot.data() as SpellingRoom)
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
    if (room.players.length >= MAX_PLAYERS) throw new Error('ROOM_FULL')
    if (room.players.some((player) => player.name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error('NAME_TAKEN')
    }
    const teamId = gameMode(room) === 'team'
      ? room.teams.reduce((smallest, team) => {
          const count = room.players.filter((player) => player.teamId === team.id).length
          const smallestCount = room.players.filter((player) => player.teamId === smallest.id).length
          return count < smallestCount ? team : smallest
        }).id
      : undefined
    return {
      ...room,
      players: [...room.players, { id: playerId, name: name.trim(), score: 0, turns: 0, ...(teamId ? { teamId } : {}) }],
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
    (snapshot) => snapshot.exists() ? onRoom(normalizeRoom(snapshot.data() as SpellingRoom)) : onError('Room not found.'),
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
    if (room.players.length >= MAX_PLAYERS) throw new Error('ROOM_FULL')
    if (room.players.some((player) => player.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('NAME_TAKEN')
    const guestId = randomId('guest')
    const teamId = gameMode(room) === 'team'
      ? room.teams.reduce((smallest, team) => {
          const count = room.players.filter((player) => player.teamId === team.id).length
          const smallestCount = room.players.filter((player) => player.teamId === smallest.id).length
          return count < smallestCount ? team : smallest
        }).id
      : undefined
    return {
      ...room,
      players: [...room.players, {
        id: guestId,
        name: name.trim(),
        score: 0,
        turns: 0,
        isGuest: true,
        ...(teamId ? { teamId } : {}),
      }],
      playerOrder: [...room.playerOrder, guestId],
    }
  })
}

export async function setGameMode(code: string, actorId: string, mode: GameMode): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (room.status !== 'lobby') throw new Error('GAME_STARTED')
    const players = mode === 'team' && room.players.some((player) => !player.teamId)
      ? assignBalancedTeams(room.players)
      : room.players
    return { ...room, mode, players }
  })
}

export async function shuffleTeamAssignments(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (room.status !== 'lobby') throw new Error('GAME_STARTED')
    const defaultNames = new Map(createDefaultTeams().map((team) => [team.id, team.name]))
    return {
      ...room,
      mode: 'team',
      players: assignBalancedTeams(room.players),
      teams: room.teams.map((team) => ({ ...team, name: defaultNames.get(team.id) ?? team.name })),
    }
  })
}

export async function movePlayerToTeam(code: string, actorId: string, playerId: string, teamId: TeamId): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (room.status !== 'lobby') throw new Error('GAME_STARTED')
    if (!room.teams.some((team) => team.id === teamId)) return room
    return {
      ...room,
      players: room.players.map((player) => player.id === playerId ? { ...player, teamId } : player),
    }
  })
}

export async function renameTeam(code: string, actorId: string, teamId: TeamId, name: string): Promise<void> {
  await mutate(code, (room) => {
    if (room.status !== 'lobby') throw new Error('GAME_STARTED')
    if (!canRenameTeam(room, actorId, teamId)) throw new Error('TEAM_NAME_FORBIDDEN')
    const validated = validatedTeamName(room.teams, teamId, name)
    return { ...room, teams: room.teams.map((team) => team.id === teamId ? { ...team, name: validated } : team) }
  })
}

export async function setTeamColor(code: string, actorId: string, teamId: TeamId, color: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (room.status !== 'lobby') throw new Error('GAME_STARTED')
    if (!/^#[0-9a-f]{6}$/i.test(color)) return room
    return { ...room, teams: room.teams.map((team) => team.id === teamId ? { ...team, color } : team) }
  })
}

export async function startSpellingGame(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (room.players.length < 2) throw new Error('NEED_PLAYERS')
    if (eligibleTemporaryJudges(room).length === 0) throw new Error('NEED_JUDGE')
    if (gameMode(room) === 'team') {
      if (room.players.length < 4 || room.teams.some((team) => !room.players.some((player) => player.teamId === team.id))) {
        throw new Error('NEED_TEAMS')
      }
    }
    const playerOrder = gameMode(room) === 'team' ? alternatingTeamOrder(room.players) : room.playerOrder
    const firstPlayerId = playerOrder[0]
    const started: SpellingRoom = {
      ...room,
      status: 'playing',
      playerOrder,
      turnIndex: 0,
      currentTurn: gameMode(room) === 'team'
        ? null
        : makeTurn(firstPlayerId, room.revision + 1, judgeIdForPlayer(room, firstPlayerId)),
      faceOffHistory: [],
      openingCategory: null,
    }
    return gameMode(room) === 'team' ? { ...started, ...createFaceOff(started, 1, 'round') } : started
  })
}

export async function unlockFaceOff(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = room.faceOff
    if (!faceOff || faceOff.status !== 'ready') return room
    if (actorId !== room.hostId && actorId !== faceOff.judgeId) throw new Error('JUDGE_ONLY')
    return { ...room, faceOff: { ...faceOff, status: 'open' } }
  })
}

export async function buzzFaceOff(code: string, actorId: string, overridePlayerId?: string): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = room.faceOff
    if (!faceOff || faceOff.status !== 'open') return room
    const playerId = overridePlayerId ?? actorId
    if (overridePlayerId && actorId !== room.hostId) throw new Error('HOST_ONLY')
    if (!faceOff.representativeIds.includes(playerId) || (!overridePlayerId && actorId !== playerId)) {
      throw new Error('BUZZER_ONLY')
    }
    return {
      ...room,
      faceOff: { ...faceOff, status: 'attempt', buzzedPlayerId: playerId, attemptPlayerId: playerId },
    }
  })
}

export async function resetFaceOffBuzz(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const faceOff = room.faceOff
    if (!faceOff || (faceOff.status !== 'attempt' && faceOff.status !== 'steal')) return room
    const resetFaceOff = { ...faceOff }
    delete resetFaceOff.buzzedPlayerId
    delete resetFaceOff.attemptPlayerId
    return {
      ...room,
      faceOff: { ...resetFaceOff, status: 'open' },
    }
  })
}

export async function judgeFaceOff(code: string, actorId: string, correct: boolean): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = room.faceOff
    if (!faceOff || (faceOff.status !== 'attempt' && faceOff.status !== 'steal') || !faceOff.attemptPlayerId) return room
    if (actorId !== faceOff.judgeId) throw new Error('JUDGE_ONLY')
    const attemptPlayer = room.players.find((player) => player.id === faceOff.attemptPlayerId)
    const winnerTeamId = attemptPlayer?.teamId
    if (correct && winnerTeamId) {
      const record = {
        id: faceOff.id,
        kind: faceOff.kind,
        round: faceOff.round,
        representativeIds: faceOff.representativeIds,
        category: faceOff.category,
        wordId: faceOff.wordId,
        winnerPlayerId: attemptPlayer.id,
        winnerTeamId,
      }
      if (faceOff.kind === 'tiebreak') {
        return {
          ...room,
          status: 'finished',
          faceOff: null,
          teams: room.teams.map((team) => team.id === winnerTeamId ? { ...team, score: team.score + 1 } : team),
          faceOffHistory: [...room.faceOffHistory, record],
        }
      }
      return {
        ...room,
        faceOff: { ...faceOff, status: 'category', winnerPlayerId: attemptPlayer.id, winnerTeamId },
        teams: room.teams.map((team) => team.id === winnerTeamId
          ? { ...team, score: team.score + pointsForRound(faceOff.round) }
          : team),
        faceOffHistory: [...room.faceOffHistory, record],
      }
    }
    if (faceOff.status === 'attempt') {
      const stealPlayerId = faceOff.representativeIds.find((playerId) => playerId !== faceOff.attemptPlayerId)
      return { ...room, faceOff: { ...faceOff, status: 'steal', attemptPlayerId: stealPlayerId } }
    }
    const record = {
      id: faceOff.id,
      kind: faceOff.kind,
      round: faceOff.round,
      representativeIds: faceOff.representativeIds,
      category: faceOff.category,
      wordId: faceOff.wordId,
    }
    const withoutWinner = { ...room, faceOffHistory: [...room.faceOffHistory, record] }
    if (faceOff.kind === 'tiebreak') return { ...withoutWinner, ...createFaceOff(withoutWinner, 3, 'tiebreak') }
    const categoryFaceOff = { ...faceOff }
    delete categoryFaceOff.attemptPlayerId
    return { ...withoutWinner, faceOff: { ...categoryFaceOff, status: 'category' } }
  })
}

export async function chooseFaceOffRallyCategory(code: string, actorId: string, category: Category): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = room.faceOff
    if (!faceOff || faceOff.kind !== 'round' || faceOff.status !== 'category') return room
    if (!faceOff.categoryOptions.includes(category)) return room
    const actor = room.players.find((player) => player.id === actorId)
    if (faceOff.winnerTeamId) {
      if (actorId !== room.hostId && actor?.teamId !== faceOff.winnerTeamId) throw new Error('TEAM_ONLY')
    } else if (actorId !== room.hostId) {
      throw new Error('HOST_ONLY')
    }
    const startingTeamId = faceOff.winnerTeamId ?? room.playerOrder
      .map((playerId) => room.players.find((player) => player.id === playerId)?.teamId)
      .find((teamId): teamId is TeamId => Boolean(teamId)) ?? 'honey'
    return startRally(room, category, startingTeamId)
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
    const word = drawWord(WORD_BANK, category, difficulty === 1 ? 'warmup' : difficulty === 2 ? 'tricky' : 'menace', room.usedWordIds, { mode: gameMode(room) })
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
    if (!turn || !turn.wordId || (actorId !== room.hostId && actorId !== turn.playerId && actorId !== judgeIdForTurn(room))) return room
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
    const team = gameMode(room) === 'team' ? teamForPlayer(room, turn.playerId) : undefined
    const saved = Boolean(turn.saveActive && correct)
    return {
      ...room,
      currentTurn: { ...turn, ruling: correct ? (saved ? 'saved' : 'correct') : 'incorrect' },
      players: room.players.map((player) => player.id === turn.playerId
        ? { ...player, score: player.score + points, turns: player.turns + 1 }
        : player),
      teams: team
        ? room.teams.map((item) => item.id === team.id ? { ...item, score: item.score + points } : item)
        : room.teams,
      history: [...room.history, {
        turnId: turn.turnId,
        playerId: turn.playerId,
        wordId: turn.wordId,
        category: turn.category,
        round,
        correct,
        points,
        ...(team ? { teamId: team.id } : {}),
        ...(turn.saveActive ? { saved: correct } : {}),
      }],
    }
  })
}

export async function activateSaveTheBee(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    const turn = room.currentTurn
    const record = room.history.at(-1)
    if (gameMode(room) !== 'team' || !turn || turn.ruling !== 'incorrect' || turn.saveActive) return room
    if (!record || record.turnId !== turn.turnId) return room
    const team = teamForPlayer(room, turn.playerId)
    if (!team) return room
    const actor = room.players.find((player) => player.id === actorId)
    if (actorId !== room.hostId && actor?.teamId !== team.id) throw new Error('TEAM_ONLY')
    const round = roundForTurn(room.turnIndex, room.playerOrder.length)
    if (remainingSaveTokens(team, round) < 1) throw new Error('NO_SAVE_TOKENS')
    return {
      ...room,
      currentTurn: { ...turn, ruling: null, saveActive: true, saveEndsAt: Date.now() + 12_000 },
      players: room.players.map((player) => player.id === turn.playerId
        ? { ...player, turns: Math.max(0, player.turns - 1) }
        : player),
      teams: room.teams.map((item) => item.id === team.id
        ? {
            ...item,
            saveTokensUsed: item.saveTokensUsed.map((used, index) => index === round - 1 ? used + 1 : used),
          }
        : item),
      history: room.history.slice(0, -1),
    }
  })
}

export async function declineSaveTheBee(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const turn = room.currentTurn
    if (!turn || turn.ruling !== 'incorrect' || turn.saveActive) return room
    return { ...room, currentTurn: { ...turn, saveDeclined: true } }
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
      currentTurn: { ...turn, ruling: null, saveDeclined: false },
      players: room.players.map((player) => player.id === record.playerId
        ? { ...player, score: player.score - record.points, turns: Math.max(0, player.turns - 1) }
        : player),
      teams: record.teamId
        ? room.teams.map((team) => team.id === record.teamId ? { ...team, score: team.score - record.points } : team)
        : room.teams,
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
    const word = drawWord(WORD_BANK, turn.category, difficulty, room.usedWordIds, { mode: gameMode(room) })
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
    if (gameMode(room) !== 'team') return { ...room, ...nextTurn(room) }
    const nextIndex = room.turnIndex + 1
    const playerCount = room.playerOrder.length
    const totalTurns = playerCount * 3
    if (nextIndex >= totalTurns) {
      const [first, second] = rankedTeams(room.teams)
      if (first && second && first.score === second.score) {
        const tiedRoom = { ...room, turnIndex: nextIndex, currentTurn: null, openingCategory: null }
        return { ...tiedRoom, ...createFaceOff(tiedRoom, 3, 'tiebreak') }
      }
      return { ...room, turnIndex: nextIndex, currentTurn: null, faceOff: null, openingCategory: null, status: 'finished' }
    }
    if (nextIndex % playerCount === 0) {
      const round = roundForTurn(nextIndex, playerCount)
      const betweenRounds = { ...room, turnIndex: nextIndex, currentTurn: null, faceOff: null, openingCategory: null }
      return { ...betweenRounds, ...createFaceOff(betweenRounds, round, 'round') }
    }
    const nextPlayerId = room.playerOrder[nextIndex % playerCount]
    const turn = makeTurn(nextPlayerId, room.revision + 1, judgeIdForPlayer(room, nextPlayerId))
    if (nextIndex % playerCount === 1 && room.openingCategory) {
      const round = roundForTurn(nextIndex, playerCount)
      const difficulty = round === 1 ? 'warmup' : round === 2 ? 'tricky' : 'menace'
      const word = drawWord(WORD_BANK, room.openingCategory, difficulty, room.usedWordIds, { mode: 'team' })
      return {
        ...room,
        turnIndex: nextIndex,
        currentTurn: { ...turn, category: room.openingCategory, wordId: word.id },
        usedWordIds: [...room.usedWordIds, word.id],
      }
    }
    return { ...room, turnIndex: nextIndex, currentTurn: turn }
  })
}

export async function replayRoom(code: string, actorId: string, choice: ReplayChoice = 'same'): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const players = choice === 'shuffle' && gameMode(room) === 'team'
      ? assignBalancedTeams(room.players)
      : room.players
    const playerOrder = gameMode(room) === 'team'
      ? alternatingTeamOrder(players)
      : players.map((player) => player.id)
    const firstPlayerId = playerOrder[0]
    const startImmediately = choice === 'same'
    const defaultNames = new Map(createDefaultTeams().map((team) => [team.id, team.name]))
    const resetRoom: SpellingRoom = {
      ...room,
      status: startImmediately ? 'playing' : 'lobby',
      players: players.map((player) => ({ ...player, score: 0, turns: 0 })),
      playerOrder,
      teams: room.teams.map((team) => ({
        ...team,
        name: choice === 'shuffle' ? defaultNames.get(team.id) ?? team.name : team.name,
        score: 0,
        saveTokensUsed: [0, 0, 0],
      })),
      turnIndex: 0,
      currentTurn: startImmediately && gameMode(room) === 'classic'
        ? makeTurn(firstPlayerId, room.revision + 1, judgeIdForPlayer(room, firstPlayerId))
        : null,
      faceOff: null,
      faceOffHistory: [],
      faceOffRotationOffset: room.faceOffRotationOffset + (gameMode(room) === 'team' ? 3 : 0),
      openingCategory: null,
      history: [],
      usedWordIds: [],
    }
    return startImmediately && gameMode(room) === 'team'
      ? { ...resetRoom, ...createFaceOff(resetRoom, 1, 'round') }
      : resetRoom
  })
}
