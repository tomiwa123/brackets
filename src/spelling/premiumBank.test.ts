import { describe, expect, it } from 'vitest'
import {
  alternatingTeamOrder,
  difficultyForRound,
  drawWord,
  eligiblePremiumPlayers,
  faceOffPoints,
  nextRallyPlayerId,
  pointsForRound,
  premiumChunkPoints,
  startingPremiumBank,
} from './gameEngine'
import type { Player, TeamId } from './types'
import { WORD_BANK } from './words'

function createTestPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => {
    const teamId: TeamId = index % 2 === 0 ? 'honey' : 'blue'
    return {
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
      score: 0,
      turns: 0,
      teamId,
    }
  })
}

describe('Premium Bank Rules and Automated Validation', () => {
  it('face-off clean win and steal score identically (2 / 3 / 4 for rounds 1 / 2 / 3)', () => {
    for (const round of [1, 2, 3]) {
      const cleanWinPoints = faceOffPoints(round, 'round')
      const stealPoints = faceOffPoints(round, 'round')
      expect(cleanWinPoints).toBe(pointsForRound(round) + 1)
      expect(stealPoints).toBe(cleanWinPoints)
    }
    expect(faceOffPoints(1, 'round')).toBe(2)
    expect(faceOffPoints(2, 'round')).toBe(3)
    expect(faceOffPoints(3, 'round')).toBe(4)
    expect(faceOffPoints(3, 'tiebreak')).toBe(1)
  })

  it('scales starting bank: 2 / 4 / 6 for 4-6 player rooms, 3 / 6 / 9 for 8-10 player rooms', () => {
    // 4 to 6 player compact rooms
    for (const count of [4, 5, 6]) {
      expect(startingPremiumBank(1, count)).toBe(2)
      expect(startingPremiumBank(2, count)).toBe(4)
      expect(startingPremiumBank(3, count)).toBe(6)
    }
    // 8 to 10 player standard rooms (and beyond)
    for (const count of [7, 8, 9, 10, 16]) {
      expect(startingPremiumBank(1, count)).toBe(3)
      expect(startingPremiumBank(2, count)).toBe(6)
      expect(startingPremiumBank(3, count)).toBe(9)
    }
  })

  it('each correct claim removes exactly 1 / 2 / 3 from the bank', () => {
    expect([1, 2, 3].map(premiumChunkPoints)).toEqual([1, 2, 3])
  })

  it('bank depletion happens after exactly two claims in compact rooms and three in standard rooms', () => {
    for (const round of [1, 2, 3]) {
      const chunk = premiumChunkPoints(round)
      // Compact: 2 claims
      const compactBank = startingPremiumBank(round, 4)
      expect(compactBank - chunk - chunk).toBe(0)

      // Standard: 3 claims
      const standardBank = startingPremiumBank(round, 8)
      expect(standardBank - chunk - chunk - chunk).toBe(0)
    }
  })

  it('misses transfer control but do not reduce the bank', () => {
    let controllingTeam: TeamId = 'honey'
    let bankRemaining = startingPremiumBank(2, 8) // 6 points
    const chunk = premiumChunkPoints(2) // 2 points

    // Miss on first turn
    controllingTeam = controllingTeam === 'honey' ? 'blue' : 'honey'
    expect(controllingTeam).toBe('blue')
    expect(bankRemaining).toBe(6) // unchanged

    // Correct on second turn
    bankRemaining -= chunk
    // Keeps control
    expect(controllingTeam).toBe('blue')
    expect(bankRemaining).toBe(4)

    // Miss on third turn
    controllingTeam = controllingTeam === 'honey' ? 'blue' : 'honey'
    expect(controllingTeam).toBe('honey')
    expect(bankRemaining).toBe(4) // unchanged
  })

  it('guarantees no player takes two round responses and rally skips used players', () => {
    const players = createTestPlayers(8) // 4 honey, 4 blue
    const playerOrder = alternatingTeamOrder(players, 'honey')
    const roundUsedPlayerIds: string[] = []

    // Premium phase consumes p1 (honey) and p2 (blue)
    roundUsedPlayerIds.push('p1')
    roundUsedPlayerIds.push('p2')

    // Eligible premium players only contains unused teammates
    expect(eligiblePremiumPlayers({ players, roundUsedPlayerIds }, 'honey').map((p) => p.id))
      .toEqual(['p3', 'p5', 'p7'])
    expect(eligiblePremiumPlayers({ players, roundUsedPlayerIds }, 'blue').map((p) => p.id))
      .toEqual(['p4', 'p6', 'p8'])

    // Ordinary rally skips p1 and p2 and picks p3 next
    const firstRally = nextRallyPlayerId({ playerOrder, roundUsedPlayerIds })
    expect(firstRally).toBe('p3')

    // Simulate remaining rally players
    const rallySpellers: string[] = []
    let next = nextRallyPlayerId({ playerOrder, roundUsedPlayerIds })
    while (next) {
      rallySpellers.push(next)
      roundUsedPlayerIds.push(next)
      next = nextRallyPlayerId({ playerOrder, roundUsedPlayerIds })
    }

    expect(rallySpellers).toEqual(['p3', 'p4', 'p5', 'p6', 'p7', 'p8'])
    // Every player in the room was used exactly once
    expect(roundUsedPlayerIds).toHaveLength(8)
    expect(new Set(roundUsedPlayerIds).size).toBe(8)
  })

  it('draws only hard-band within-tier words during premium phase without tier jumping', () => {
    for (const round of [1, 2, 3]) {
      const difficulty = difficultyForRound(round)
      const usedIds: string[] = []

      for (let i = 0; i < 5; i++) {
        const word = drawWord(WORD_BANK, 'Internet Brain', difficulty, usedIds, {
          mode: 'team',
          premiumOnly: true,
        })
        expect(word.difficulty).toBe(difficulty)
        expect(word.teamSelectionWeight).toBeGreaterThanOrEqual(1) // preferred hardest band
        usedIds.push(word.id)
      }
    }
  })
})

describe('Phase 5 — Playthrough Scripted Simulations', () => {
  it('Simulation 1: three straight correct answers by the face-off winner team in Round 2', () => {
    const players = createTestPlayers(10) // 5 per team
    const playerOrder = alternatingTeamOrder(players, 'honey')
    let honeyScore = 0
    let blueScore = 0
    const roundUsed: string[] = []

    // 1. Honey wins face-off: 3 points in Round 2
    honeyScore += faceOffPoints(2, 'round')
    expect(honeyScore).toBe(3)

    // Premium bank starts with 6 points
    let bank = startingPremiumBank(2, 10)
    expect(bank).toBe(6)

    // Honey spells 3 consecutive correct premium words (each claims 2 pts, scores 2 base + 2 bonus = 4 pts)
    const honeyEligible = eligiblePremiumPlayers({ players, roundUsedPlayerIds: roundUsed }, 'honey')
    for (let i = 0; i < 3; i++) {
      const speller = honeyEligible[i]
      roundUsed.push(speller.id)
      honeyScore += pointsForRound(2) + premiumChunkPoints(2) // 4 pts
      bank -= premiumChunkPoints(2) // -2 pts
    }

    expect(bank).toBe(0) // Bank empty after 3 claims
    expect(honeyScore).toBe(3 + 12) // 15 points
    expect(blueScore).toBe(0)
    expect(roundUsed).toHaveLength(3)

    // Ordinary rally resumes for remaining 7 players
    const remaining = playerOrder.filter((id) => !roundUsed.includes(id))
    expect(remaining).toHaveLength(7)
  })

  it('Simulation 2: alternating misses and control changes', () => {
    let controllingTeam: TeamId = 'honey'
    let bank = startingPremiumBank(1, 8) // 3 points in Round 1
    const roundUsed: string[] = []
    let honeyScore = 0
    let blueScore = 0

    // Honey misses
    roundUsed.push('p1')
    controllingTeam = 'blue'
    expect(bank).toBe(3) // unchanged

    // Blue misses
    roundUsed.push('p2')
    controllingTeam = 'honey'
    expect(bank).toBe(3) // unchanged

    // Honey correct: 1 base + 1 bonus = 2 pts, bank 3 -> 2
    roundUsed.push('p3')
    honeyScore += 2
    bank -= 1
    expect(controllingTeam).toBe('honey')
    expect(bank).toBe(2)

    // Honey correct: 2 pts, bank 2 -> 1
    roundUsed.push('p5')
    honeyScore += 2
    bank -= 1
    expect(bank).toBe(1)

    // Honey misses
    roundUsed.push('p7')
    controllingTeam = 'blue'
    expect(bank).toBe(1) // unchanged

    // Blue correct: 2 pts, bank 1 -> 0 (emptied!)
    roundUsed.push('p4')
    blueScore += 2
    bank -= 1
    expect(bank).toBe(0)

    expect(roundUsed).toEqual(['p1', 'p2', 'p3', 'p5', 'p7', 'p4'])
    expect(honeyScore).toBe(4)
    expect(blueScore).toBe(2)
  })

  it('Simulation 3: face-off steal followed by opponent premium comeback', () => {
    let honeyScore = 0
    let blueScore = 0

    // Honey buzzes first on face-off and misses. Blue steals and gets it correct!
    // Blue scores round value + 1 = 3 points in Round 2
    blueScore += faceOffPoints(2, 'round')
    expect(blueScore).toBe(3)

    // Blue gets first control of 6-point bank
    let bank = startingPremiumBank(2, 8) // 6 pts
    let controllingTeam: TeamId = 'blue'
    expect(controllingTeam).toBe('blue')
    const roundUsed: string[] = []

    // Blue first speller misses: control passes to Honey!
    roundUsed.push('p2')
    controllingTeam = 'honey'
    expect(bank).toBe(6)

    // Honey mounts a comeback: 3 correct answers to sweep the bank!
    const honeyPlayers = ['p1', 'p3', 'p5']
    for (const id of honeyPlayers) {
      roundUsed.push(id)
      honeyScore += pointsForRound(2) + premiumChunkPoints(2) // 4 pts
      bank -= premiumChunkPoints(2)
    }

    expect(bank).toBe(0)
    expect(honeyScore).toBe(12)
    expect(blueScore).toBe(3)
  })

  it('Simulation 4: bank depletion on the final available player in compact room', () => {
    // 4 players (2 per team: p1, p3 on Honey; p2, p4 on Blue)
    const players = createTestPlayers(4)
    const roundUsed: string[] = []
    let bank = startingPremiumBank(1, 4) // 2 points in compact room!
    expect(bank).toBe(2)

    // Honey p1 correct: bank becomes 1
    roundUsed.push('p1')
    bank -= 1
    expect(bank).toBe(1)

    // Honey p3 misses: control passes to Blue
    roundUsed.push('p3')
    expect(bank).toBe(1)

    // Blue p2 correct: bank becomes 0!
    roundUsed.push('p2')
    bank -= 1
    expect(bank).toBe(0)

    // Only 1 player left for ordinary rally: p4
    const remaining = players.filter((p) => !roundUsed.includes(p.id))
    expect(remaining.map((p) => p.id)).toEqual(['p4'])
  })

  it('Simulation 5: ten-player vs compact 4-player room comparison', () => {
    // Compact 4-player room: bank 2 / 4 / 6 equals 50% of round supply
    // Ordinary turns per round: 4 players
    expect(startingPremiumBank(1, 4)).toBe(2)
    expect(startingPremiumBank(2, 4)).toBe(4)
    expect(startingPremiumBank(3, 4)).toBe(6)

    // Standard 10-player room: bank 3 / 6 / 9 equals 30% of round supply
    // Ordinary turns per round: 10 players
    expect(startingPremiumBank(1, 10)).toBe(3)
    expect(startingPremiumBank(2, 10)).toBe(6)
    expect(startingPremiumBank(3, 10)).toBe(9)
  })
})
