import { doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../services/firebase'
import {
  activeHostId,
  alternatingTeamOrder,
  assignBalancedTeams,
  canRenameTeam,
  createDefaultTeams,
  difficultyForRound,
  drawWord,
  eligiblePremiumPlayers,
  eligibleTemporaryJudges,
  gameMode,
  hasHostControl,
  judgeIdForPlayer,
  judgeIdForTurn,
  makeTurn,
  nextTeamPlayer,
  bonusGameValue,
  nextRallyPlayerId,
  nextTurn,
  playersInOrder,
  pointsForRound,
  premiumChunkPoints,
  randomizedPlayerOrder,
  rankedTeams,
  remainingSaveTokens,
  roundForTurn,
  teamForPlayer,
  validatedTeamName,
} from './gameEngine'
import { CATEGORIES } from './types'
import type { BonusGame, BonusGameKind, Category, CurrentTurn, FaceOff, GameMode, Hint, ReplayChoice, SpellingRoom, TeamId } from './types'
import { WORD_BANK } from './words'
import { MAX_PLAYERS } from './config'
import {
  applyFaceOffRulingState,
  chooseExhaustedFaceOffCategoryState,
  clearFaceOffRecoveryState,
  continueFaceOffResultState,
  createFaceOffState,
  replaceFaceOffWordState,
  undoFaceOffRulingState,
} from './faceOffEngine'

const COLLECTION = 'spellingRooms'
const PLAYER_KEY = 'spelling-night-player-id'
const SESSION_KEY = 'spelling-night-session'
const PLAYTHROUGH_PERSONA_KEY = 'spelling-night-playthrough-persona'
const PLAYTHROUGH_PERSONAS = ['host', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6'] as const

export type PlaythroughPlayerPersona = (typeof PLAYTHROUGH_PERSONAS)[number]

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
}

export function getSpellingPlayerId(): string {
  const key = scopedStorageKey(PLAYER_KEY)
  let id = localStorage.getItem(key)
  if (!id) {
    id = randomId('player')
    localStorage.setItem(key, id)
  }
  return id
}

export function rememberSession(roomCode: string, name: string): void {
  localStorage.setItem(scopedStorageKey(SESSION_KEY), JSON.stringify({ roomCode, name }))
}

export function getRememberedSession(): { roomCode: string; name: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(scopedStorageKey(SESSION_KEY)) ?? 'null') as unknown
    if (!value || typeof value !== 'object') return null
    const session = value as { roomCode?: unknown; name?: unknown }
    return typeof session.roomCode === 'string' && typeof session.name === 'string'
      ? { roomCode: session.roomCode, name: session.name }
      : null
  } catch {
    return null
  }
}

export function isPlaythroughMode(): boolean {
  return window.location.pathname.startsWith('/spelling/playthrough')
}

function selectedPlaythroughPersona(): PlaythroughPlayerPersona {
  const selected = localStorage.getItem(PLAYTHROUGH_PERSONA_KEY)
  return PLAYTHROUGH_PERSONAS.includes(selected as PlaythroughPlayerPersona)
    ? selected as PlaythroughPlayerPersona
    : 'host'
}

function scopedStorageKey(baseKey: string, persona = selectedPlaythroughPersona()): string {
  return isPlaythroughMode() ? `${baseKey}:playthrough:${persona}` : baseKey
}

export function selectPlaythroughPersona(persona: PlaythroughPlayerPersona): void {
  localStorage.setItem(PLAYTHROUGH_PERSONA_KEY, persona)
}

export function getStoredPlaythroughPlayerId(persona: PlaythroughPlayerPersona): string | null {
  return localStorage.getItem(`${PLAYER_KEY}:playthrough:${persona}`)
}

export function clearPlaythroughSessions(): void {
  PLAYTHROUGH_PERSONAS.forEach((persona) => {
    localStorage.removeItem(`${PLAYER_KEY}:playthrough:${persona}`)
    localStorage.removeItem(`${SESSION_KEY}:playthrough:${persona}`)
  })
  localStorage.removeItem(PLAYTHROUGH_PERSONA_KEY)
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
    premiumBank: room.premiumBank ?? null,
    roundUsedPlayerIds: room.roundUsedPlayerIds ?? [],
    openingCategory: room.openingCategory ?? null,
    bonusGame: room.bonusGame ?? null,
  }
}

const FACE_OFF_CATEGORIES = CATEGORIES.filter((category) => category !== "Dealer's Choice")

function faceOffJudgeId(room: SpellingRoom, representativeIds: string[]): string {
  const activeHost = activeHostId(room)
  if (!representativeIds.includes(activeHost)) return activeHost
  return playersInOrder(room.players, room.playerOrder).find((player) =>
    player.id !== activeHost
    && (!room.temporaryHostId || player.id !== room.hostId)
    && !player.isGuest
    && !representativeIds.includes(player.id),
  )?.id ?? eligibleTemporaryJudges(room)[0]?.id ?? activeHost
}

function startRally(room: SpellingRoom, category: Category, startingTeamId: TeamId): SpellingRoom {
  const playerOrder = alternatingTeamOrder(playersInOrder(room.players, room.playerOrder), startingTeamId)
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
    currentTurn: { ...turn, category, wordId: word.id, spellingStartedAt: Date.now() },
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
        premiumBank: null,
        roundUsedPlayerIds: [],
        openingCategory: null,
        bonusGame: null,
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

export async function closeSpellingRoom(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    if (room.hostId !== actorId) throw new Error('OWNER_ONLY')
    return { ...room, status: 'closed' }
  })
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
  if (!hasHostControl(room, actorId)) throw new Error('HOST_ONLY')
}

export async function assignTemporaryHost(code: string, actorId: string, playerId: string | null): Promise<void> {
  await mutate(code, (room) => {
    if (room.hostId !== actorId) throw new Error('OWNER_ONLY')
    if (playerId === null) {
      if (!room.temporaryHostId) return room
      const restored = { ...room }
      delete restored.temporaryHostId
      if (restored.currentTurn) {
        const judgeId = restored.currentTurn.playerId === room.hostId
          ? eligibleTemporaryJudges(restored)[0]?.id ?? restored.currentTurn.judgeId ?? room.hostId
          : room.hostId
        restored.currentTurn = {
          ...restored.currentTurn,
          judgeId,
        }
      }
      if (restored.faceOff) {
        restored.faceOff = {
          ...restored.faceOff,
          judgeId: faceOffJudgeId(restored, restored.faceOff.representativeIds),
        }
      }
      return restored
    }
    const delegate = room.players.find((player) => player.id === playerId)
    if (!delegate || delegate.id === room.hostId || delegate.isGuest) throw new Error('INVALID_TEMP_HOST')
    const delegated = { ...room, temporaryHostId: delegate.id }
    if (delegated.currentTurn) {
      const judgeId = delegated.currentTurn.playerId === delegate.id
        ? eligibleTemporaryJudges(delegated)[0]?.id ?? delegated.currentTurn.judgeId ?? room.hostId
        : delegate.id
      delegated.currentTurn = {
        ...delegated.currentTurn,
        judgeId,
      }
    }
    if (delegated.faceOff) {
      delegated.faceOff = {
        ...delegated.faceOff,
        judgeId: faceOffJudgeId(delegated, delegated.faceOff.representativeIds),
      }
    }
    return delegated
  })
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
    const playerOrder = randomizedPlayerOrder(room.players, gameMode(room))
    const firstPlayerId = playerOrder[0]
    const started: SpellingRoom = {
      ...room,
      status: 'playing',
      playerOrder,
      turnIndex: 0,
      currentTurn: gameMode(room) === 'team'
        ? null
        : makeTurn(firstPlayerId, room.revision + 1, judgeIdForPlayer({ ...room, playerOrder }, firstPlayerId)),
      faceOffHistory: [],
      premiumBank: null,
      roundUsedPlayerIds: [],
      openingCategory: null,
      bonusGame: null,
    }
    return gameMode(room) === 'team' ? { ...started, ...createFaceOffState(started, 1, 'round') } : started
  })
}

export async function unlockFaceOff(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = room.faceOff
    if (!faceOff || faceOff.status !== 'ready' || !faceOff.wordId) return room
    if (!hasHostControl(room, actorId) && actorId !== faceOff.judgeId) throw new Error('JUDGE_ONLY')
    return { ...room, faceOff: { ...clearFaceOffRecoveryState(faceOff), status: 'open' } }
  })
}

export async function buzzFaceOff(code: string, actorId: string, overridePlayerId?: string): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = room.faceOff
    if (!faceOff || faceOff.status !== 'open') return room
    const playerId = overridePlayerId ?? actorId
    if (overridePlayerId && actorId !== faceOff.judgeId && !hasHostControl(room, actorId)) throw new Error('JUDGE_ONLY')
    if (!faceOff.representativeIds.includes(playerId) || (!overridePlayerId && actorId !== playerId)) {
      throw new Error('BUZZER_ONLY')
    }
    return {
      ...room,
      faceOff: {
        ...clearFaceOffRecoveryState(faceOff),
        status: 'attempt',
        buzzedPlayerId: playerId,
        attemptPlayerId: playerId,
        attemptStartedAt: Date.now(),
      },
    }
  })
}

export async function resetFaceOffBuzz(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = room.faceOff
    if (faceOff && actorId !== faceOff.judgeId && !hasHostControl(room, actorId)) throw new Error('JUDGE_ONLY')
    if (!faceOff || (faceOff.status !== 'attempt' && faceOff.status !== 'steal')) return room
    const resetFaceOff = clearFaceOffRecoveryState(faceOff)
    delete resetFaceOff.buzzedPlayerId
    delete resetFaceOff.attemptPlayerId
    delete resetFaceOff.attemptStartedAt
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
    return applyFaceOffRulingState(room, correct)
  })
}

function requireFaceOffRecoveryAuthority(room: SpellingRoom, actorId: string): FaceOff {
  const faceOff = room.faceOff
  if (!faceOff) throw new Error('FACE_OFF_UNAVAILABLE')
  if (!hasHostControl(room, actorId) && actorId !== faceOff.judgeId) throw new Error('JUDGE_ONLY')
  return faceOff
}

export async function resolveNoBuzz(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = requireFaceOffRecoveryAuthority(room, actorId)
    if (faceOff.status !== 'open') return room
    return replaceFaceOffWordState(room, 'no-buzz')
  })
}

export async function replaceFaceOffWord(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = requireFaceOffRecoveryAuthority(room, actorId)
    if (!['ready', 'open', 'attempt', 'steal'].includes(faceOff.status)) return room
    return replaceFaceOffWordState(room, 'replacement')
  })
}

export async function undoFaceOffRuling(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireFaceOffRecoveryAuthority(room, actorId)
    return undoFaceOffRulingState(room)
  })
}

export async function continueFaceOffResult(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireFaceOffRecoveryAuthority(room, actorId)
    return continueFaceOffResultState(room)
  })
}

export async function chooseFaceOffReplacementCategory(code: string, actorId: string, category: Category): Promise<void> {
  await mutate(code, (room) => {
    requireFaceOffRecoveryAuthority(room, actorId)
    return chooseExhaustedFaceOffCategoryState(room, category)
  })
}

export async function reassignFaceOffJudge(code: string, actorId: string, judgeId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const faceOff = room.faceOff
    const judge = room.players.find((player) => player.id === judgeId)
    if (!faceOff || !['ready', 'exhausted'].includes(faceOff.status)) return room
    if (!judge || judge.isGuest || faceOff.representativeIds.includes(judge.id)) throw new Error('INVALID_FACE_OFF_JUDGE')
    return { ...room, faceOff: { ...faceOff, judgeId: judge.id, notice: `${judge.name} is now judging this face-off.` } }
  })
}

export async function substituteFaceOffRepresentative(code: string, actorId: string, playerId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const faceOff = room.faceOff
    const replacement = room.players.find((player) => player.id === playerId)
    if (!faceOff || !replacement?.teamId || ['result', 'exhausted'].includes(faceOff.status)) return room
    const replacedIndex = faceOff.representativeIds.findIndex((id) => room.players.find((player) => player.id === id)?.teamId === replacement.teamId)
    if (replacedIndex < 0 || faceOff.representativeIds.includes(replacement.id)) throw new Error('INVALID_REPRESENTATIVE')
    const representativeIds = [...faceOff.representativeIds]
    representativeIds[replacedIndex] = replacement.id
    const judgeId = representativeIds.includes(faceOff.judgeId)
      ? faceOffJudgeId(room, representativeIds)
      : faceOff.judgeId
    if (faceOff.status === 'ready') {
      return { ...room, faceOff: { ...clearFaceOffRecoveryState(faceOff), representativeIds, judgeId, notice: `${replacement.name} steps in for the face-off.` } }
    }
    return replaceFaceOffWordState(room, 'substitution', { representativeIds, judgeId })
  })
}

export async function selectPremiumPlayer(code: string, actorId: string, playerId: string): Promise<void> {
  await mutate(code, (room) => {
    const bank = room.premiumBank
    if (!bank || room.currentTurn) return room
    const actor = room.players.find((player) => player.id === actorId)
    const isControllingMember = actor?.teamId === bank.controllingTeamId
    if (!hasHostControl(room, actorId) && !isControllingMember) throw new Error('TEAM_ONLY')
    const targetPlayer = room.players.find((player) => player.id === playerId)
    if (!targetPlayer || targetPlayer.teamId !== bank.controllingTeamId) throw new Error('INVALID_PLAYER')
    if ((room.roundUsedPlayerIds ?? []).includes(playerId)) throw new Error('PLAYER_ALREADY_USED')
    return {
      ...room,
      premiumBank: { ...bank, selectedPlayerId: playerId },
    }
  })
}

export async function confirmPremiumTurn(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    const bank = room.premiumBank
    if (!bank || room.currentTurn) return room
    const selectedPlayerId = bank.selectedPlayerId
    if (!selectedPlayerId) throw new Error('NO_PLAYER_SELECTED')
    const actor = room.players.find((player) => player.id === actorId)
    const isSelectedPlayer = actorId === selectedPlayerId
    const isControllingMember = actor?.teamId === bank.controllingTeamId
    if (!hasHostControl(room, actorId) && !isSelectedPlayer && !isControllingMember) throw new Error('TEAM_ONLY')
    if ((room.roundUsedPlayerIds ?? []).includes(selectedPlayerId)) throw new Error('PLAYER_ALREADY_USED')

    const difficulty = difficultyForRound(bank.round)
    const word = drawWord(WORD_BANK, bank.carriedCategory, difficulty, room.usedWordIds, { mode: 'team', premiumOnly: true })
    const basePoints = pointsForRound(bank.round)
    const bonusPoints = premiumChunkPoints(bank.round)
    const turn: CurrentTurn = {
      turnId: `${Date.now()}-${room.revision + 1}-${selectedPlayerId}`,
      playerId: selectedPlayerId,
      judgeId: judgeIdForPlayer(room, selectedPlayerId) ?? undefined,
      category: bank.carriedCategory,
      wordId: word.id,
      isPremium: true,
      basePoints,
      bonusPoints,
      requestedHints: [],
      ruling: null,
      spellingStartedAt: Date.now(),
    }
    return {
      ...room,
      currentTurn: turn,
      usedWordIds: [...room.usedWordIds, word.id],
    }
  })
}

export async function chooseFaceOffRallyCategory(code: string, actorId: string, category: Category): Promise<void> {
  await mutate(code, (room) => {
    const faceOff = room.faceOff
    if (!faceOff || faceOff.kind !== 'round' || faceOff.status !== 'category') return room
    if (!faceOff.categoryOptions.includes(category)) return room
    const actor = room.players.find((player) => player.id === actorId)
    if (faceOff.winnerTeamId) {
      if (!hasHostControl(room, actorId) && actor?.teamId !== faceOff.winnerTeamId) throw new Error('TEAM_ONLY')
    } else if (!hasHostControl(room, actorId)) {
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
    if (!turn || turn.playerId !== activeHostId(room) || turn.wordId) return room
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
    if (!hasHostControl(room, actorId) && actorId !== turn.playerId) throw new Error('NOT_YOUR_TURN')
    const difficulty = roundForTurn(room.turnIndex, room.playerOrder.length)
    const word = drawWord(WORD_BANK, category, difficulty === 1 ? 'warmup' : difficulty === 2 ? 'tricky' : 'menace', room.usedWordIds, { mode: gameMode(room) })
    return {
      ...room,
      currentTurn: { ...turn, category, wordId: word.id, spellingStartedAt: Date.now() },
      usedWordIds: [...room.usedWordIds, word.id],
    }
  })
}

export async function requestHint(code: string, actorId: string, hint: Hint): Promise<void> {
  await mutate(code, (room) => {
    const turn = room.currentTurn
    if (!turn || !turn.wordId || (!hasHostControl(room, actorId) && actorId !== turn.playerId)) return room
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
    const round = turn.isPremium ? (room.premiumBank?.round ?? roundForTurn(room.turnIndex, room.playerOrder.length)) : roundForTurn(room.turnIndex, room.playerOrder.length)
    const team = gameMode(room) === 'team' ? teamForPlayer(room, turn.playerId) : undefined

    if (turn.isPremium && room.premiumBank) {
      const bank = room.premiumBank
      const basePoints = turn.basePoints ?? pointsForRound(bank.round)
      const bonusPoints = turn.bonusPoints ?? premiumChunkPoints(bank.round)
      const points = correct ? basePoints + bonusPoints : 0
      const nextRemaining = correct ? Math.max(0, bank.remainingPoints - bonusPoints) : bank.remainingPoints
      const otherTeamId: TeamId = bank.controllingTeamId === 'honey' ? 'blue' : 'honey'
      const nextControllingTeamId: TeamId = correct ? bank.controllingTeamId : otherTeamId
      const nextRoundUsed = (room.roundUsedPlayerIds ?? []).includes(turn.playerId)
        ? room.roundUsedPlayerIds
        : [...(room.roundUsedPlayerIds ?? []), turn.playerId]

      return {
        ...room,
        currentTurn: { ...turn, ruling: correct ? 'correct' : 'incorrect' },
        roundUsedPlayerIds: nextRoundUsed,
        premiumBank: {
          ...bank,
          remainingPoints: nextRemaining,
          controllingTeamId: nextControllingTeamId,
        },
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
          round: bank.round,
          correct,
          points,
          isPremium: true,
          basePoints,
          bonusPoints,
          ...(team ? { teamId: team.id } : {}),
        }],
      }
    }

    const points = correct ? pointsForRound(round) : 0
    const saved = Boolean(turn.saveActive && correct)
    const nextRoundUsed = (room.roundUsedPlayerIds ?? []).includes(turn.playerId)
      ? room.roundUsedPlayerIds
      : [...(room.roundUsedPlayerIds ?? []), turn.playerId]
    return {
      ...room,
      currentTurn: { ...turn, ruling: correct ? (saved ? 'saved' : 'correct') : 'incorrect' },
      roundUsedPlayerIds: nextRoundUsed,
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
    if (gameMode(room) !== 'team' || !turn || turn.isPremium || turn.ruling !== 'incorrect' || turn.saveActive) return room
    if (!record || record.turnId !== turn.turnId) return room
    const team = teamForPlayer(room, turn.playerId)
    if (!team) return room
    const actor = room.players.find((player) => player.id === actorId)
    if (actor?.teamId !== team.id) throw new Error('TEAM_ONLY')
    const round = roundForTurn(room.turnIndex, room.playerOrder.length)
    if (remainingSaveTokens(team, round) < 1) throw new Error('NO_SAVE_TOKENS')
    return {
      ...room,
      currentTurn: { ...turn, ruling: null, saveActive: true, saveEndsAt: Date.now() + 30_000 },
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
    if (judgeIdForTurn(room) !== actorId && !hasHostControl(room, actorId)) throw new Error('JUDGE_ONLY')
    const turn = room.currentTurn
    const record = room.history.at(-1)
    if (!turn?.ruling || !record || record.turnId !== turn.turnId) return room
    const nextRoundUsed = (room.roundUsedPlayerIds ?? []).filter((id) => id !== record.playerId)
    let nextBank = room.premiumBank
    if (turn.isPremium && nextBank) {
      const bonusToRestore = record.correct ? (record.bonusPoints ?? 0) : 0
      const prevControlling = record.correct
        ? nextBank.controllingTeamId
        : (nextBank.controllingTeamId === 'honey' ? 'blue' : 'honey')
      nextBank = {
        ...nextBank,
        remainingPoints: nextBank.remainingPoints + bonusToRestore,
        controllingTeamId: prevControlling,
      }
    }
    return {
      ...room,
      currentTurn: { ...turn, ruling: null, saveDeclined: false },
      premiumBank: nextBank,
      roundUsedPlayerIds: nextRoundUsed,
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

export async function replaceWord(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    if (judgeIdForTurn(room) !== actorId && !hasHostControl(room, actorId)) throw new Error('JUDGE_ONLY')
    const turn = room.currentTurn
    if (!turn?.category || turn.ruling) return room
    const round = turn.isPremium ? (room.premiumBank?.round ?? roundForTurn(room.turnIndex, room.playerOrder.length)) : roundForTurn(room.turnIndex, room.playerOrder.length)
    const difficulty = difficultyForRound(round)
    const word = drawWord(WORD_BANK, turn.category, difficulty, room.usedWordIds, {
      mode: gameMode(room),
      premiumOnly: Boolean(turn.isPremium),
      strictCategory: true,
    })
    return {
      ...room,
      currentTurn: {
        ...turn,
        wordId: word.id,
        spellingStartedAt: Date.now(),
        requestedHints: [],
        notice: 'Word replaced — no result.',
      },
      usedWordIds: [...room.usedWordIds, word.id],
    }
  })
}

export async function replaceBonusWord(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const bonus = room.bonusGame
    if (!bonus || bonus.phase === 'complete' || bonus.ruling) return room
    const difficulty = bonus.kind === 'feud' ? 'tricky' : 'menace'
    const word = drawWord(WORD_BANK, bonus.category, difficulty, room.usedWordIds, {
      mode: 'team',
      premiumOnly: bonus.kind === 'relay',
      strictCategory: true,
    })
    const wordIds = [...bonus.wordIds]
    wordIds[bonus.wordIndex] = word.id
    return {
      ...room,
      bonusGame: { ...bonus, wordIds, notice: 'Word replaced — no result. Restart this word from the beginning.' },
      usedWordIds: [...room.usedWordIds, word.id],
    }
  })
}

export async function advanceTurn(code: string, actorId: string): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    if (!room.currentTurn?.ruling) return room
    if (gameMode(room) !== 'team') return { ...room, ...nextTurn(room) }

    const playerCount = room.playerOrder.length
    const currentRound = room.premiumBank?.round ?? roundForTurn(room.turnIndex, playerCount)

    // Handle premium turn advance
    if (room.currentTurn.isPremium && room.premiumBank) {
      const bank = room.premiumBank
      const honeyEligible = eligiblePremiumPlayers(room, 'honey')
      const blueEligible = eligiblePremiumPlayers(room, 'blue')
      const bankEmpty = bank.remainingPoints <= 0
      const noEligiblePlayers = honeyEligible.length === 0 && blueEligible.length === 0

      // If bank is empty or neither team has players left, premium phase ends!
      if (bankEmpty || noEligiblePlayers) {
        const nextRallyId = nextRallyPlayerId(room)
        if (nextRallyId) {
          // Rally begins!
          const turn = makeTurn(nextRallyId, room.revision + 1, judgeIdForPlayer(room, nextRallyId))
          return {
            ...room,
            premiumBank: null,
            currentTurn: turn,
          }
        } else {
          // All players in room used this round
          if (currentRound < 3) {
            const nextRound = currentRound + 1
            const betweenRounds = {
              ...room,
              turnIndex: playerCount * currentRound,
              currentTurn: null,
              faceOff: null,
              premiumBank: null,
              roundUsedPlayerIds: [],
              openingCategory: null,
            }
            return { ...betweenRounds, ...createFaceOffState(betweenRounds, nextRound, 'round') }
          }
          // End of round 3: check tiebreak
          const [first, second] = rankedTeams(room.teams)
          if (first && second && first.score === second.score) {
            const tiedRoom = {
              ...room,
              turnIndex: playerCount * 3,
              currentTurn: null,
              faceOff: null,
              premiumBank: null,
              roundUsedPlayerIds: [],
              openingCategory: null,
            }
            return { ...tiedRoom, ...createFaceOffState(tiedRoom, 3, 'tiebreak') }
          }
          return {
            ...room,
            turnIndex: playerCount * 3,
            currentTurn: null,
            faceOff: null,
            premiumBank: null,
            status: 'finished',
          }
        }
      }

      // Premium bank continues
      let controllingTeamId = bank.controllingTeamId
      if (eligiblePremiumPlayers(room, controllingTeamId).length === 0) {
        controllingTeamId = controllingTeamId === 'honey' ? 'blue' : 'honey'
      }

      return {
        ...room,
        currentTurn: null,
        premiumBank: {
          ...bank,
          controllingTeamId,
          selectedPlayerId: null,
        },
      }
    }

    // Normal rally turn advance
    const nextRallyId = nextRallyPlayerId(room)
    if (nextRallyId) {
      const turn = makeTurn(nextRallyId, room.revision + 1, judgeIdForPlayer(room, nextRallyId))
      return {
        ...room,
        turnIndex: room.turnIndex + 1,
        currentTurn: turn,
      }
    }

    // Round complete
    if (currentRound < 3) {
      const nextRound = currentRound + 1
      const betweenRounds = {
        ...room,
        turnIndex: playerCount * currentRound,
        currentTurn: null,
        faceOff: null,
        premiumBank: null,
        roundUsedPlayerIds: [],
        openingCategory: null,
      }
      return { ...betweenRounds, ...createFaceOffState(betweenRounds, nextRound, 'round') }
    }

    // End of round 3: check tiebreak
    const [first, second] = rankedTeams(room.teams)
    if (first && second && first.score === second.score) {
      const tiedRoom = {
        ...room,
        turnIndex: playerCount * 3,
        currentTurn: null,
        faceOff: null,
        premiumBank: null,
        roundUsedPlayerIds: [],
        openingCategory: null,
      }
      return { ...tiedRoom, ...createFaceOffState(tiedRoom, 3, 'tiebreak') }
    }
    return {
      ...room,
      turnIndex: playerCount * 3,
      currentTurn: null,
      faceOff: null,
      premiumBank: null,
      status: 'finished',
    }
  })
}

export async function replayRoom(code: string, actorId: string, choice: ReplayChoice = 'same'): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const players = choice === 'shuffle' && gameMode(room) === 'team'
      ? assignBalancedTeams(room.players)
      : room.players
    const playerOrder = randomizedPlayerOrder(players, gameMode(room))
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
        ? makeTurn(firstPlayerId, room.revision + 1, judgeIdForPlayer({ ...room, playerOrder }, firstPlayerId))
        : null,
      faceOff: null,
      faceOffHistory: [],
      faceOffRotationOffset: room.faceOffRotationOffset + (gameMode(room) === 'team' ? 3 : 0),
      premiumBank: null,
      roundUsedPlayerIds: [],
      openingCategory: null,
      bonusGame: null,
      history: [],
      usedWordIds: [],
    }
    return startImmediately && gameMode(room) === 'team'
      ? { ...resetRoom, ...createFaceOffState(resetRoom, 1, 'round') }
      : resetRoom
  })
}

export async function startBonusGame(code: string, actorId: string, kind: BonusGameKind): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const walkthroughLaunch = isPlaythroughMode() && room.status === 'lobby'
    if ((!walkthroughLaunch && room.status !== 'finished') || (!walkthroughLaunch && gameMode(room) !== 'team')) throw new Error('BONUS_UNAVAILABLE')
    if (walkthroughLaunch && room.players.length < 4) throw new Error('NEED_TEAMS')
    const walkthroughPlayers = walkthroughLaunch ? assignBalancedTeams(room.players, () => 0.5) : room.players
    const preparedRoom: SpellingRoom = walkthroughLaunch
      ? {
          ...room,
          mode: 'team',
          players: walkthroughPlayers,
          teams: room.teams.map((team) => ({ ...team, score: 0, saveTokensUsed: [0, 0, 0] })),
          playerOrder: randomizedPlayerOrder(walkthroughPlayers, 'team'),
          currentTurn: null,
          faceOff: null,
          premiumBank: null,
          roundUsedPlayerIds: [],
          openingCategory: null,
          history: [],
          usedWordIds: [],
        }
      : room
    const leader = [...preparedRoom.faceOffHistory].reverse().find((record) => record.winnerTeamId)?.winnerTeamId
      ?? rankedTeams(preparedRoom.teams)[0]?.id
      ?? 'honey'
    const category = FACE_OFF_CATEGORIES[(preparedRoom.faceOffHistory.length + preparedRoom.history.length) % FACE_OFF_CATEGORIES.length]
    const count = kind === 'feud' ? 4 : 2
    const difficulty = kind === 'feud' ? 'tricky' : 'menace'
    const words = [...preparedRoom.usedWordIds]
    const wordIds: string[] = []
    for (let index = 0; index < count; index += 1) {
      const word = drawWord(WORD_BANK, category, difficulty, words, { mode: 'team', premiumOnly: kind === 'relay' })
      words.push(word.id)
      wordIds.push(word.id)
    }
    const orderedPlayers = playersInOrder(preparedRoom.players, preparedRoom.playerOrder)
    const first = nextTeamPlayer(orderedPlayers, leader, 0)
    if (!first) throw new Error('NEED_TEAMS')
    const bonusGame: BonusGame = {
      kind, phase: 'playing', controllingTeamId: leader, activeTeamId: leader, category,
      wordIds, wordIndex: 0, strikes: 0, boardValue: bonusGameValue(kind), activePlayerId: first.id,
      playerIndexes: { honey: 0, blue: 0 }, ruling: null,
    }
    return { ...preparedRoom, status: 'playing', bonusGame, usedWordIds: words }
  })
}

export async function judgeBonusGame(code: string, actorId: string, correct: boolean): Promise<void> {
  await mutate(code, (room) => {
    requireHost(room, actorId)
    const bonus = room.bonusGame
    if (!bonus || bonus.phase === 'complete' || bonus.ruling) return room
    const activeBonus = { ...bonus }
    delete activeBonus.notice
    const other: TeamId = bonus.activeTeamId === 'honey' ? 'blue' : 'honey'
    if (bonus.kind === 'relay') {
      const last = bonus.wordIndex >= bonus.wordIds.length - 1
      const nextTeam: TeamId = other
      const awarded = correct ? bonus.boardValue : 0
      return {
        ...room,
        status: last ? 'finished' : 'playing',
        teams: room.teams.map((team) => team.id === bonus.activeTeamId ? { ...team, score: team.score + awarded } : team),
        bonusGame: last ? { ...activeBonus, phase: 'complete', ruling: correct ? 'correct' : 'incorrect' } : {
          ...activeBonus, wordIndex: bonus.wordIndex + 1, activeTeamId: nextTeam,
          activePlayerId: nextTeamPlayer(playersInOrder(room.players, room.playerOrder), nextTeam, 0)!.id, ruling: null,
        },
      }
    }
    if (bonus.phase === 'steal') {
      const awarded = correct ? bonus.boardValue : 0
      return { ...room, status: 'finished', teams: room.teams.map((team) => team.id === bonus.activeTeamId ? { ...team, score: team.score + awarded } : team), bonusGame: { ...activeBonus, phase: 'complete', ruling: correct ? 'correct' : 'incorrect' } }
    }
    if (correct) {
      const nextIndex = bonus.wordIndex + 1
      if (nextIndex >= 3) {
        return { ...room, status: 'finished', teams: room.teams.map((team) => team.id === bonus.activeTeamId ? { ...team, score: team.score + bonus.boardValue } : team), bonusGame: { ...activeBonus, phase: 'complete', ruling: 'correct', wordIndex: 2 } }
      }
      const pi = bonus.playerIndexes[bonus.activeTeamId] + 1
      return { ...room, bonusGame: { ...activeBonus, wordIndex: nextIndex, playerIndexes: { ...bonus.playerIndexes, [bonus.activeTeamId]: pi }, activePlayerId: nextTeamPlayer(playersInOrder(room.players, room.playerOrder), bonus.activeTeamId, pi)!.id } }
    }
    const strikes = bonus.strikes + 1
    if (strikes >= 2) {
      const stealTeam: TeamId = other
      return { ...room, bonusGame: { ...activeBonus, phase: 'steal', activeTeamId: stealTeam, activePlayerId: nextTeamPlayer(playersInOrder(room.players, room.playerOrder), stealTeam, 0)!.id, wordIndex: 3, boardValue: Math.max(1, 3 - bonus.wordIndex), strikes } }
    }
    const pi = bonus.playerIndexes[bonus.activeTeamId] + 1
    return { ...room, bonusGame: { ...activeBonus, strikes, playerIndexes: { ...bonus.playerIndexes, [bonus.activeTeamId]: pi }, activePlayerId: nextTeamPlayer(playersInOrder(room.players, room.playerOrder), bonus.activeTeamId, pi)!.id } }
  })
}
