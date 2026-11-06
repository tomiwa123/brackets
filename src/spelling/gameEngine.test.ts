import { describe, expect, it } from 'vitest'
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
  faceOffPoints,
  faceOffRepresentativeIds,
  hasHostControl,
  judgeIdForPlayer,
  nextRallyPlayerId,
  nextTurn,
  pointsForRound,
  premiumChunkPoints,
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

    expect(nextTurn(room).currentTurn?.playerId).toBe('host')
    expect(nextTurn(room).currentTurn?.judgeId).toBe('player')
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

    expect(eligiblePremiumPlayers({ players, roundUsedPlayerIds: [] }, 'honey').map((p) => p.id)).toEqual(['h1', 'h2'])
    expect(eligiblePremiumPlayers({ players, roundUsedPlayerIds: ['h1'] }, 'honey').map((p) => p.id)).toEqual(['h2'])
    expect(eligiblePremiumPlayers({ players, roundUsedPlayerIds: ['h1', 'h2'] }, 'honey')).toEqual([])

    // In ordinary rally, skips used players
    expect(nextRallyPlayerId({ playerOrder, roundUsedPlayerIds: ['h1'] })).toBe('b1')
    expect(nextRallyPlayerId({ playerOrder, roundUsedPlayerIds: ['h1', 'b1'] })).toBe('h2')
    expect(nextRallyPlayerId({ playerOrder, roundUsedPlayerIds: ['h1', 'b1', 'h2'] })).toBe('b2')
    expect(nextRallyPlayerId({ playerOrder, roundUsedPlayerIds: ['h1', 'b1', 'h2', 'b2'] })).toBeNull()
  })
})
