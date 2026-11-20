import { describe, expect, it } from 'vitest'
import {
  activeHostId,
  aggregateSpellingAdminStats,
  bonusGameValue,
  alternatingTeamOrder,
  assignBalancedTeams,
  canRenameTeam,
  createDefaultTeams,
  difficultyForRound,
  drawWord,
  eligiblePremiumPlayers,
  eligibleTemporaryJudges,
  faceOffPoints,
  faceOffRepresentativeIds,
  hasHostControl,
  isValidSpellingAdminPassphrase,
  judgeIdForPlayer,
  nextRallyPlayerId,
  nextTeamPlayer,
  nextTurn,
  normalizeSpellingAdminPassphrase,
  playersInOrder,
  pointsForRound,
  premiumChunkPoints,
  randomizedPlayerOrder,
  remainingSaveTokens,
  roundForTurn,
  saveTokensForRound,
  startingPremiumBank,
  validatedTeamName,
} from './gameEngine'
import type { Player, SpellingRoom, WordCard } from './types'

describe('spelling game engine', () => {
  it('gives every player three ordered turns', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => roundForTurn(i, 2))).toEqual([1, 1, 2, 2, 3, 3])
    expect([1, 2, 3].map(difficultyForRound)).toEqual(['warmup', 'tricky', 'menace'])
    expect([1, 2, 3].map(pointsForRound)).toEqual([1, 2, 3])
  })

  it('sets compact bonus values and rotates every teammate in bonus play', () => {
    const players: Player[] = [
      { id: 'h1', name: 'H1', score: 0, turns: 0, teamId: 'honey' },
      { id: 'h2', name: 'H2', score: 0, turns: 0, teamId: 'honey' },
      { id: 'b1', name: 'B1', score: 0, turns: 0, teamId: 'blue' },
    ]
    expect(bonusGameValue('feud')).toBe(3)
    expect(bonusGameValue('relay')).toBe(2)
    expect([0, 1, 2].map((index) => nextTeamPlayer(players, 'honey', index)?.id)).toEqual(['h1', 'h2', 'h1'])
  })

  it('never draws a used word and respects category', () => {
    const cards: WordCard[] = [
      { id: 'a', word: 'pixel', pronunciation: 'PIK-suhl', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup' },
      { id: 'b', word: 'cache', pronunciation: 'cash', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup' },
    ]
    expect(drawWord(cards, 'Internet Brain', 'warmup', ['a'], { random: () => 0 }).id).toBe('b')
  })

  it('raises team difficulty within a round without changing the round tier', () => {
    const cards: WordCard[] = [
      { id: 'easy', word: 'pixel', pronunciation: 'PIK-suhl', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup', teamSelectionWeight: 0 },
      { id: 'middle', word: 'podcast', pronunciation: 'POD-kast', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup', teamSelectionWeight: 1 },
      { id: 'hard', word: 'thumbnail', pronunciation: 'THUM-nayl', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup', teamSelectionWeight: 2 },
      { id: 'later-round', word: 'cryptography', pronunciation: 'krip-TOG-ruh-fee', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'tricky', teamSelectionWeight: 2 },
    ]

    expect(drawWord(cards, 'Internet Brain', 'warmup', [], { mode: 'classic', random: () => 0 }).id).toBe('easy')
    expect(drawWord(cards, 'Internet Brain', 'warmup', [], { mode: 'team', random: () => 0 }).id).toBe('middle')
    expect(drawWord(cards, 'Internet Brain', 'warmup', [], { mode: 'team', random: () => 0.5 }).id).toBe('hard')
  })

  it('finishes only after all three rounds', () => {
    const room = {
      hostId: 'a',
      players: [
        { id: 'a', name: 'Host', score: 0, turns: 0 },
        { id: 'b', name: 'Player', score: 0, turns: 0 },
      ],
      playerOrder: ['a', 'b'], turnIndex: 4, revision: 5,
    } as SpellingRoom
    expect(nextTurn(room).status).toBe('playing')
    expect(nextTurn({ ...room, turnIndex: 5 }).status).toBe('finished')
  })

  it('supports all 60 turns in a 20-player game', () => {
    const players = Array.from({ length: 20 }, (_, index) => ({
      id: `player-${index + 1}`,
      name: `Player ${index + 1}`,
      score: 0,
      turns: 0,
    }))
    const room = {
      hostId: players[0].id,
      players,
      playerOrder: players.map((player) => player.id),
      turnIndex: 58,
      revision: 59,
    } as SpellingRoom

    expect(roundForTurn(59, players.length)).toBe(3)
    expect(nextTurn(room).status).toBe('playing')
    expect(nextTurn({ ...room, turnIndex: 59 }).status).toBe('finished')
  })

  it('assigns a non-guest temporary judge when the host spells', () => {
    const room = {
      hostId: 'host',
      players: [
        { id: 'host', name: 'Host', score: 0, turns: 0 },
        { id: 'guest', name: 'Guest', score: 0, turns: 0, isGuest: true },
        { id: 'player', name: 'Player', score: 0, turns: 0 },
      ],
      playerOrder: ['host', 'guest', 'player'],
    } as SpellingRoom

    expect(eligibleTemporaryJudges(room).map((player) => player.id)).toEqual(['player'])
    expect(judgeIdForPlayer(room, 'host')).toBe('player')
    expect(judgeIdForPlayer(room, 'player')).toBe('host')
  })

  it('puts judge assignment on each new turn', () => {
    const room = {
      hostId: 'host',
      players: [
        { id: 'host', name: 'Host', score: 0, turns: 0 },
        { id: 'player', name: 'Player', score: 0, turns: 0 },
      ],
      playerOrder: ['host', 'player'],
      turnIndex: 1,
      revision: 2,
    } as SpellingRoom

    expect(nextTurn(room, () => 0.999).currentTurn?.playerId).toBe('host')
    expect(nextTurn(room, () => 0.999).currentTurn?.judgeId).toBe('player')
  })

  it('transfers host authority and judging to a temporary host', () => {
    const room = {
      hostId: 'owner',
      temporaryHostId: 'delegate',
      players: [
        { id: 'owner', name: 'Owner', score: 0, turns: 0 },
        { id: 'delegate', name: 'Delegate', score: 0, turns: 0 },
        { id: 'player', name: 'Player', score: 0, turns: 0 },
      ],
      playerOrder: ['owner', 'delegate', 'player'],
    } as SpellingRoom

    expect(activeHostId(room)).toBe('delegate')
    expect(hasHostControl(room, 'delegate')).toBe(true)
    expect(hasHostControl(room, 'owner')).toBe(false)
    expect(judgeIdForPlayer(room, 'player')).toBe('delegate')
    expect(judgeIdForPlayer(room, 'delegate')).toBe('player')
    expect(eligibleTemporaryJudges(room).map((player) => player.id)).toEqual(['player'])
  })

  it('scales Save the Bee supply with each round', () => {
    const team = { ...createDefaultTeams()[0], saveTokensUsed: [0, 1, 2] }
    expect([1, 2, 3].map(saveTokensForRound)).toEqual([1, 2, 3])
    expect([1, 2, 3].map((round) => remainingSaveTokens(team, round))).toEqual([1, 1, 1])
  })

  it('balances teams and alternates their rally turns', () => {
    const players: Player[] = Array.from({ length: 5 }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
      score: 0,
      turns: 0,
    }))
    const assigned = assignBalancedTeams(players, () => 0.5)
    const counts = assigned.reduce((result, player) => ({
      ...result,
      [player.teamId!]: (result[player.teamId!] ?? 0) + 1,
    }), {} as Record<string, number>)
    expect(Math.abs(counts.honey - counts.blue)).toBe(1)
    expect(alternatingTeamOrder(assigned).map((id) => assigned.find((player) => player.id === id)?.teamId))
      .toEqual(['honey', 'blue', 'honey', 'blue', 'honey'])
    expect(alternatingTeamOrder(assigned, 'blue').map((id) => assigned.find((player) => player.id === id)?.teamId))
      .toEqual(['blue', 'honey', 'blue', 'honey', 'honey'])
  })

  it('randomizes classic order instead of privileging the host or join order', () => {
    const players: Player[] = Array.from({ length: 4 }, (_, index) => ({
      id: index === 0 ? 'host' : `player-${index + 1}`,
      name: `Player ${index + 1}`,
      score: 0,
      turns: 0,
    }))

    const order = randomizedPlayerOrder(players, 'classic', () => 0)
    expect(order).toEqual(['player-2', 'player-3', 'player-4', 'host'])
    expect(new Set(order)).toEqual(new Set(players.map((player) => player.id)))
  })

  it('randomizes team queues and which team spells first while preserving alternation', () => {
    const players: Player[] = [
      { id: 'h1', name: 'H1', score: 0, turns: 0, teamId: 'honey' },
      { id: 'b1', name: 'B1', score: 0, turns: 0, teamId: 'blue' },
      { id: 'h2', name: 'H2', score: 0, turns: 0, teamId: 'honey' },
      { id: 'b2', name: 'B2', score: 0, turns: 0, teamId: 'blue' },
    ]
    const order = randomizedPlayerOrder(players, 'team', () => 0.999)
    const teams = order.map((id) => players.find((player) => player.id === id)?.teamId)

    expect(teams).toEqual(['blue', 'honey', 'blue', 'honey'])
    expect(playersInOrder(players, order).map((player) => player.id)).toEqual(order)
  })

  it('reshuffles classic players at every round boundary', () => {
    const room = {
      hostId: 'host',
      players: [
        { id: 'host', name: 'Host', score: 0, turns: 0 },
        { id: 'later', name: 'Later joiner', score: 0, turns: 0 },
      ],
      playerOrder: ['host', 'later'],
      turnIndex: 1,
      revision: 2,
    } as SpellingRoom

    const next = nextTurn(room, () => 0)
    expect(next.playerOrder).toEqual(['later', 'host'])
    expect(next.currentTurn?.playerId).toBe('later')
  })

  it('gives team members ownership of their name with host fallback', () => {
    const room = {
      hostId: 'host',
      players: [
        { id: 'host', name: 'Host', score: 0, turns: 0, teamId: 'honey' },
        { id: 'honey', name: 'Honey', score: 0, turns: 0, teamId: 'honey' },
        { id: 'blue', name: 'Blue', score: 0, turns: 0, teamId: 'blue' },
      ],
    } as SpellingRoom

    expect(canRenameTeam(room, 'host', 'blue')).toBe(true)
    expect(canRenameTeam(room, 'honey', 'honey')).toBe(true)
    expect(canRenameTeam(room, 'honey', 'blue')).toBe(false)
  })

  it('validates team names after trimming and ignores case for duplicates', () => {
    const teams = createDefaultTeams()
    expect(validatedTeamName(teams, 'honey', '  Hive Minds  ')).toBe('Hive Minds')
    expect(() => validatedTeamName(teams, 'honey', '   ')).toThrow('TEAM_NAME_REQUIRED')
    expect(() => validatedTeamName(teams, 'honey', 'a'.repeat(25))).toThrow('TEAM_NAME_TOO_LONG')
    expect(() => validatedTeamName(teams, 'honey', ' blueBELLS ')).toThrow('TEAM_NAME_TAKEN')
  })

  it('rotates one face-off representative from each team', () => {
    const players: Player[] = [
      { id: 'h1', name: 'Honey 1', score: 0, turns: 0, teamId: 'honey' },
      { id: 'b1', name: 'Blue 1', score: 0, turns: 0, teamId: 'blue' },
      { id: 'h2', name: 'Honey 2', score: 0, turns: 0, teamId: 'honey' },
      { id: 'b2', name: 'Blue 2', score: 0, turns: 0, teamId: 'blue' },
    ]
    expect(faceOffRepresentativeIds(players, 0)).toEqual(['h1', 'b1'])
    expect(faceOffRepresentativeIds(players, 1)).toEqual(['h2', 'b2'])
    expect(faceOffRepresentativeIds(players, 2)).toEqual(['h1', 'b1'])
  })

  it('scales Premium Bank starting bonus for compact 4-6 rooms and standard 8-10 rooms', () => {
    // Compact 4-6 player rooms: 2 / 4 / 6
    for (const count of [4, 5, 6]) {
      expect([1, 2, 3].map((r) => startingPremiumBank(r, count))).toEqual([2, 4, 6])
    }
    // Standard 8-10 (and larger) rooms: 3 / 6 / 9
    for (const count of [7, 8, 10, 12]) {
      expect([1, 2, 3].map((r) => startingPremiumBank(r, count))).toEqual([3, 6, 9])
    }
    // Drained chunks match base round points
    expect([1, 2, 3].map(premiumChunkPoints)).toEqual([1, 2, 3])
  })

  it('awards normal round value + 1 for face-off wins and steals, 1 for tiebreak', () => {
    expect([1, 2, 3].map((r) => faceOffPoints(r, 'round'))).toEqual([2, 3, 4])
    expect(faceOffPoints(1, 'tiebreak')).toBe(1)
    expect(faceOffPoints(3, 'tiebreak')).toBe(1)
  })

  it('draws only hard-band words during premium phase with fallback inside tier', () => {
    const cards: WordCard[] = [
      { id: 'w0', word: 'pixel', pronunciation: 'PIK-suhl', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup', teamSelectionWeight: 0 },
      { id: 'w1', word: 'podcast', pronunciation: 'POD-kast', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup', teamSelectionWeight: 1 },
      { id: 'w2', word: 'thumbnail', pronunciation: 'THUM-nayl', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup', teamSelectionWeight: 2 },
      { id: 'diff-cat-w2', word: 'cypress', pronunciation: 'SY-prus', definition: '', origin: '', sentence: '', category: 'Bay & Beyond', difficulty: 'warmup', teamSelectionWeight: 2 },
      { id: 'next-round', word: 'cryptography', pronunciation: 'krip-TOG-ruh-fee', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'tricky', teamSelectionWeight: 2 },
    ]

    // Normal draw without premiumOnly gets weighted selection
    const normal = drawWord(cards, 'Internet Brain', 'warmup', [], { mode: 'team', random: () => 0.6 })
    expect(normal.difficulty).toBe('warmup')

    // Premium draw strictly selects hardest within-tier word (weight 2)
    const premium = drawWord(cards, 'Internet Brain', 'warmup', [], { mode: 'team', premiumOnly: true, random: () => 0 })
    expect(premium.id).toBe('w2')
    expect(premium.teamSelectionWeight).toBe(2)
    expect(premium.difficulty).toBe('warmup')

    // Deterministic fallback to weight 1 when weight 2 used in same category and tier
    const fallback1 = drawWord(cards, 'Internet Brain', 'warmup', ['w2'], { mode: 'team', premiumOnly: true })
    expect(fallback1.id).toBe('w1')

    // Deterministic fallback to weight 0 when weight 1 and 2 used in same category and tier
    const fallback0 = drawWord(cards, 'Internet Brain', 'warmup', ['w2', 'w1'], { mode: 'team', premiumOnly: true })
    expect(fallback0.id).toBe('w0')

    // Deterministic fallback across categories within same difficulty tier without jumping tier
    const fallbackCat = drawWord(cards, 'Internet Brain', 'warmup', ['w2', 'w1', 'w0'], { mode: 'team', premiumOnly: true })
    expect(fallbackCat.id).toBe('diff-cat-w2')
    expect(fallbackCat.difficulty).toBe('warmup')
  })

  it('filters eligible premium players and advances ordinary rally skipping used players', () => {
    const players: Player[] = [
      { id: 'h1', name: 'Honey 1', score: 0, turns: 0, teamId: 'honey' },
      { id: 'b1', name: 'Blue 1', score: 0, turns: 0, teamId: 'blue' },
      { id: 'h2', name: 'Honey 2', score: 0, turns: 0, teamId: 'honey' },
      { id: 'b2', name: 'Blue 2', score: 0, turns: 0, teamId: 'blue' },
    ]
    const playerOrder = ['h1', 'b1', 'h2', 'b2']

    expect(eligiblePremiumPlayers({ players, premiumBank: { attemptedPlayerIds: [] } }, 'honey').map((p) => p.id)).toEqual(['h1', 'h2'])
    expect(eligiblePremiumPlayers({ players, premiumBank: { attemptedPlayerIds: ['h1'] } }, 'honey').map((p) => p.id)).toEqual(['h2'])
    expect(eligiblePremiumPlayers({ players, premiumBank: { attemptedPlayerIds: ['h1', 'h2'] } }, 'honey')).toEqual([])

    // In ordinary rally, skips used players
    expect(nextRallyPlayerId({ playerOrder, roundUsedPlayerIds: ['h1'] })).toBe('b1')
    expect(nextRallyPlayerId({ playerOrder, roundUsedPlayerIds: ['h1', 'b1'] })).toBe('h2')
    expect(nextRallyPlayerId({ playerOrder, roundUsedPlayerIds: ['h1', 'b1', 'h2'] })).toBe('b2')
    expect(nextRallyPlayerId({ playerOrder, roundUsedPlayerIds: ['h1', 'b1', 'h2', 'b2'] })).toBeNull()
  })

  it('normalizes admin passphrases and accepts configured or default passwords', () => {
    expect(normalizeSpellingAdminPassphrase('Spelling 2026!')).toBe('spelling2026')
    expect(isValidSpellingAdminPassphrase('Spelling-2026')).toBe(true)
    expect(isValidSpellingAdminPassphrase('Custom Pass 99', ['custom-pass-99'])).toBe(true)
    expect(isValidSpellingAdminPassphrase('wrongpass', ['custom-pass-99'])).toBe(false)
    expect(isValidSpellingAdminPassphrase('   ')).toBe(false)
  })

  it('aggregates admin dashboard stats across rooms and filters rooms prior to resetAt', () => {
    const baseRoom: SpellingRoom = {
      roomCode: 'OLD1',
      title: 'Spelling bee game night',
      hostId: 'h1',
      mode: 'classic',
      teams: createDefaultTeams(),
      status: 'finished',
      players: [
        { id: 'h1', name: 'Alice', score: 3, turns: 2 },
        { id: 'p2', name: 'Bob', score: 1, turns: 1 },
      ],
      playerOrder: ['h1', 'p2'],
      turnIndex: 3,
      currentTurn: null,
      faceOff: null,
      faceOffHistory: [],
      faceOffRotationOffset: 0,
      premiumBank: null,
      roundUsedPlayerIds: [],
      openingCategory: null,
      bonusGame: null,
      history: [
        { turnId: 't1', playerId: 'h1', wordId: 'w1', category: 'Bay & Beyond', round: 1, correct: true, points: 1 },
      ],
      usedWordIds: ['w1'],
      revision: 3,
      createdAt: 1000,
      updatedAt: 1500,
    }

    const activeClassicRoom: SpellingRoom = {
      ...baseRoom,
      roomCode: 'NEW1',
      status: 'playing',
      createdAt: 2500,
      updatedAt: 2600,
      history: [
        { turnId: 't2', playerId: 'h1', wordId: 'w2', category: 'Internet Brain', round: 1, correct: true, points: 1 },
        { turnId: 't3', playerId: 'p2', wordId: 'w3', category: 'Internet Brain', round: 1, correct: false, points: 0 },
      ],
    }

    const finishedTeamRoom: SpellingRoom = {
      ...baseRoom,
      roomCode: 'NEW2',
      mode: 'team',
      status: 'finished',
      createdAt: 3000,
      updatedAt: 3500,
      teams: [
        { id: 'honey', name: 'Honeybees', color: '#d89b16', score: 7, saveTokensUsed: [0, 0, 0] },
        { id: 'blue', name: 'Bluebells', color: '#3f6fa8', score: 4, saveTokensUsed: [0, 0, 0] },
      ],
      history: [
        { turnId: 't4', playerId: 'h1', wordId: 'w4', category: 'Science & Nature', round: 2, correct: true, points: 2, teamId: 'honey' },
      ],
      faceOffHistory: [
        {
          id: 'fo1',
          kind: 'round',
          round: 1,
          representativeIds: ['h1', 'p2'],
          category: 'Passport Stamps',
          wordId: 'w5',
          winnerPlayerId: 'h1',
          winnerTeamId: 'honey',
          points: 2,
          outcome: 'winner',
        },
      ],
    }

    const stats = aggregateSpellingAdminStats(
      [baseRoom, activeClassicRoom, finishedTeamRoom],
      { visits: 12, uniqueVisits: 8, resetAt: 2000, updatedAt: 3600 },
    )

    expect(stats.visits).toBe(12)
    expect(stats.uniqueVisits).toBe(8)
    expect(stats.resetAt).toBe(2000)
    expect(stats.totalRooms).toBe(2)
    expect(stats.activeRooms).toBe(1)
    expect(stats.completedRooms).toBe(1)
    expect(stats.completionRatePercent).toBe(50)
    expect(stats.totalTurns).toBe(4)
    expect(stats.correctTurns).toBe(3)
    expect(stats.overallAccuracyPercent).toBe(75)
    expect(stats.modeCounts).toEqual({ classic: 1, team: 1 })
    expect(stats.statusCounts).toEqual({ lobby: 0, playing: 1, finished: 1, closed: 0 })
    expect(stats.recentRooms.map((room) => room.roomCode)).toEqual(['NEW2', 'NEW1'])
    expect(stats.recentRooms[0].topScore).toBe(7)

    const internetStat = stats.categoryStats.find((item) => item.category === 'Internet Brain')
    expect(internetStat).toEqual({
      category: 'Internet Brain',
      turns: 2,
      correct: 1,
      sharePercent: 50,
      accuracyPercent: 50,
    })
  })
})
