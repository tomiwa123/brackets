import type { BonusGameKind, Category, CurrentTurn, Difficulty, FaceOffKind, GameMode, Player, SpellingRoom, Team, TeamId, WordCard } from './types'

export const TOTAL_ROUNDS = 3
export const ROUND_LABELS = [
  'Familiar with a wrinkle',
  'Multiple plausible spellings',
  'The pronunciation betrays you',
] as const

export const TEAM_IDS: TeamId[] = ['honey', 'blue']

export function createDefaultTeams(): Team[] {
  return [
    { id: 'honey', name: 'Honeybees', color: '#d89b16', score: 0, saveTokensUsed: [0, 0, 0] },
    { id: 'blue', name: 'Bluebells', color: '#3f6fa8', score: 0, saveTokensUsed: [0, 0, 0] },
  ]
}

export function gameMode(room: Pick<SpellingRoom, 'mode'>): GameMode {
  return room.mode ?? 'classic'
}

export function activeHostId(room: Pick<SpellingRoom, 'hostId' | 'temporaryHostId'>): string {
  return room.temporaryHostId ?? room.hostId
}

export function hasHostControl(
  room: Pick<SpellingRoom, 'hostId' | 'temporaryHostId'>,
  actorId: string,
): boolean {
  return activeHostId(room) === actorId
}

export function saveTokensForRound(round: number): number {
  return pointsForRound(round)
}

export function remainingSaveTokens(team: Team, round: number): number {
  const used = team.saveTokensUsed?.[round - 1] ?? 0
  return Math.max(0, saveTokensForRound(round) - used)
}

export function teamForPlayer(room: Pick<SpellingRoom, 'players' | 'teams'>, playerId: string): Team | undefined {
  const teamId = room.players.find((player) => player.id === playerId)?.teamId
  return room.teams?.find((team) => team.id === teamId)
}

export function canRenameTeam(
  room: Pick<SpellingRoom, 'hostId' | 'temporaryHostId' | 'players'>,
  actorId: string,
  teamId: TeamId,
): boolean {
  return hasHostControl(room, actorId)
    || room.players.some((player) => player.id === actorId && player.teamId === teamId)
}

export function validatedTeamName(teams: Team[], teamId: TeamId, name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('TEAM_NAME_REQUIRED')
  if (trimmed.length > 24) throw new Error('TEAM_NAME_TOO_LONG')
  if (teams.some((team) => team.id !== teamId && team.name.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
    throw new Error('TEAM_NAME_TAKEN')
  }
  return trimmed
}

export function rankedTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

export function assignBalancedTeams(players: Player[], random = Math.random): Player[] {
  const shuffled = shufflePlayers(players, random)
  const assignments = new Map(shuffled.map((player, index) => [player.id, TEAM_IDS[index % TEAM_IDS.length]]))
  return players.map((player) => ({ ...player, teamId: assignments.get(player.id) }))
}

export function shufflePlayers<T>(items: T[], random = Math.random): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function alternatingTeamOrder(players: Player[], firstTeamId: TeamId = 'honey'): string[] {
  const teamIds = firstTeamId === 'honey' ? TEAM_IDS : [...TEAM_IDS].reverse()
  const queues = teamIds.map((teamId) => players.filter((player) => player.teamId === teamId))
  const order: string[] = []
  const longest = Math.max(0, ...queues.map((queue) => queue.length))
  for (let index = 0; index < longest; index += 1) {
    queues.forEach((queue) => {
      if (queue[index]) order.push(queue[index].id)
    })
  }
  return order
}

export function playersInOrder(players: Player[], playerOrder: string[]): Player[] {
  const byId = new Map(players.map((player) => [player.id, player]))
  const ordered = playerOrder
    .map((id) => byId.get(id))
    .filter((player): player is Player => Boolean(player))
  const orderedIds = new Set(ordered.map((player) => player.id))
  return [...ordered, ...players.filter((player) => !orderedIds.has(player.id))]
}

export function randomizedPlayerOrder(
  players: Player[],
  mode: GameMode,
  random = Math.random,
): string[] {
  const shuffled = shufflePlayers(players, random)
  if (mode === 'classic') return shuffled.map((player) => player.id)
  const firstTeamId = random() < 0.5 ? TEAM_IDS[0] : TEAM_IDS[1]
  return alternatingTeamOrder(shuffled, firstTeamId)
}

export function faceOffRepresentativeIds(players: Player[], sequence: number): string[] {
  return TEAM_IDS.map((teamId) => {
    const teamPlayers = players.filter((player) => player.teamId === teamId)
    return teamPlayers[sequence % teamPlayers.length]?.id
  }).filter((id): id is string => Boolean(id))
}

export function roundForTurn(turnIndex: number, playerCount: number): number {
  return Math.min(TOTAL_ROUNDS, Math.floor(turnIndex / Math.max(1, playerCount)) + 1)
}

export function difficultyForRound(round: number): Difficulty {
  return round === 1 ? 'warmup' : round === 2 ? 'tricky' : 'menace'
}

export function pointsForRound(round: number): number {
  return Math.min(TOTAL_ROUNDS, Math.max(1, round))
}

export function startingPremiumBank(round: number, playerCount: number): number {
  const isCompact = playerCount <= 6
  return isCompact ? round * 2 : round * 3
}

export function faceOffPoints(round: number, kind: FaceOffKind): number {
  return kind === 'tiebreak' ? 1 : pointsForRound(round) + 1
}

export function premiumChunkPoints(round: number): number {
  return pointsForRound(round)
}

export function premiumParticipationAfterRuling(
  roundUsedPlayerIds: string[],
  attemptedPlayerIds: string[],
  playerId: string,
  correct: boolean,
): { roundUsedPlayerIds: string[]; attemptedPlayerIds: string[] } {
  return {
    roundUsedPlayerIds: correct && !roundUsedPlayerIds.includes(playerId)
      ? [...roundUsedPlayerIds, playerId]
      : roundUsedPlayerIds,
    attemptedPlayerIds: attemptedPlayerIds.includes(playerId)
      ? attemptedPlayerIds
      : [...attemptedPlayerIds, playerId],
  }
}

export function bonusGameValue(kind: BonusGameKind): number {
  return kind === 'feud' ? 3 : 2
}

export function nextTeamPlayer(players: Player[], teamId: TeamId, index: number): Player | undefined {
  const team = players.filter((player) => player.teamId === teamId)
  return team[index % Math.max(1, team.length)]
}

export function eligiblePremiumPlayers(
  room: { players: Player[]; premiumBank: { attemptedPlayerIds: string[] } | null },
  teamId: TeamId,
): Player[] {
  const attempted = room.premiumBank?.attemptedPlayerIds ?? []
  return room.players.filter((player) => player.teamId === teamId && !attempted.includes(player.id))
}

export function nextRallyPlayerId(
  room: Pick<SpellingRoom, 'playerOrder' | 'roundUsedPlayerIds'>,
): string | null {
  const used = room.roundUsedPlayerIds ?? []
  return room.playerOrder.find((id) => !used.includes(id)) ?? null
}

export function eligibleTemporaryJudges(room: Pick<SpellingRoom, 'hostId' | 'temporaryHostId' | 'players' | 'playerOrder'>): Player[] {
  const activeHost = activeHostId(room)
  return room.playerOrder
    .map((id) => room.players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(
      player
      && player.id !== activeHost
      && (!room.temporaryHostId || player.id !== room.hostId)
      && !player.isGuest,
    ))
}

export function judgeIdForPlayer(
  room: Pick<SpellingRoom, 'hostId' | 'temporaryHostId' | 'players' | 'playerOrder'>,
  playerId: string,
): string | null {
  const activeHost = activeHostId(room)
  if (playerId !== activeHost) return activeHost
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
  options: { mode?: GameMode; premiumOnly?: boolean; strictCategory?: boolean; random?: () => number } = {},
): WordCard {
  const random = options.random ?? Math.random
  const unused = bank.filter((card) =>
    card.difficulty === difficulty &&
    !usedWordIds.includes(card.id) &&
    (category === "Dealer's Choice" || card.category === category),
  )
  const fallback = bank.filter((card) =>
    card.difficulty === difficulty && !usedWordIds.includes(card.id),
  )

  if (options.strictCategory && unused.length === 0) {
    throw new Error('WORD_CATEGORY_EXHAUSTED')
  }

  if (options.premiumOnly) {
    const hardUnused = unused.filter((card) => card.teamSelectionWeight === 2)
    const midUnused = unused.filter((card) => card.teamSelectionWeight === 1)
    const hardFallback = fallback.filter((card) => card.teamSelectionWeight === 2)
    const midFallback = fallback.filter((card) => card.teamSelectionWeight === 1)
    const premiumPool = hardUnused.length > 0
      ? hardUnused
      : midUnused.length > 0
        ? midUnused
        : unused.length > 0
          ? unused
          : hardFallback.length > 0
            ? hardFallback
            : midFallback.length > 0
              ? midFallback
              : fallback
    if (premiumPool.length === 0) throw new Error('WORD_BANK_EXHAUSTED')
    return premiumPool[Math.floor(random() * premiumPool.length)]
  }

  const weighted = (cards: WordCard[]) => options.mode === 'team'
    ? cards.flatMap((card) => Array.from({ length: card.teamSelectionWeight ?? 1 }, () => card))
    : cards
  const preferredPool = weighted(unused)
  const fallbackPool = weighted(fallback)
  // If an unusually skip-heavy game consumes all 42 preferred team words in
  // a tier, use the remaining cards rather than failing the room.
  const pool = preferredPool.length > 0
    ? preferredPool
    : fallbackPool.length > 0
      ? fallbackPool
      : unused.length > 0
        ? unused
        : fallback
  if (pool.length === 0) throw new Error('WORD_BANK_EXHAUSTED')
  return pool[Math.floor(random() * pool.length)]
}

export function rankedPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

export function nextTurn(
  room: SpellingRoom,
  random = Math.random,
): Pick<SpellingRoom, 'turnIndex' | 'currentTurn' | 'status' | 'playerOrder'> {
  const nextIndex = room.turnIndex + 1
  const totalTurns = room.playerOrder.length * TOTAL_ROUNDS
  if (nextIndex >= totalTurns) {
    return { turnIndex: nextIndex, currentTurn: null, status: 'finished', playerOrder: room.playerOrder }
  }
  const startsNewRound = nextIndex % room.playerOrder.length === 0
  const playerOrder = startsNewRound
    ? randomizedPlayerOrder(room.players, 'classic', random)
    : room.playerOrder
  const nextPlayerId = playerOrder[nextIndex % playerOrder.length]
  return {
    turnIndex: nextIndex,
    currentTurn: makeTurn(nextPlayerId, room.revision + 1, judgeIdForPlayer({ ...room, playerOrder }, nextPlayerId)),
    status: 'playing',
    playerOrder,
  }
}
