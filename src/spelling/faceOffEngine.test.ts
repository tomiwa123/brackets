import { describe, expect, it } from 'vitest'
import {
  applyFaceOffRulingState,
  chooseExhaustedFaceOffCategoryState,
  continueFaceOffResultState,
  createFaceOffState,
  replaceFaceOffWordState,
  undoFaceOffRulingState,
} from './faceOffEngine'
import { createDefaultTeams } from './gameEngine'
import type { FaceOff, SpellingRoom, WordCard } from './types'

const cards: WordCard[] = [
  { id: 'bay-1', word: 'fog', pronunciation: 'fog', definition: '', origin: '', sentence: '', category: 'Bay & Beyond', difficulty: 'warmup', teamSelectionWeight: 2 },
  { id: 'bay-2', word: 'dock', pronunciation: 'dock', definition: '', origin: '', sentence: '', category: 'Bay & Beyond', difficulty: 'warmup', teamSelectionWeight: 2 },
  { id: 'net-1', word: 'pixel', pronunciation: 'pixel', definition: '', origin: '', sentence: '', category: 'Internet Brain', difficulty: 'warmup', teamSelectionWeight: 2 },
]

function roomWith(faceOff: Partial<FaceOff> = {}): SpellingRoom {
  return {
    roomCode: 'TEST',
    title: 'Spelling bee game night',
    hostId: 'host',
    mode: 'team',
    teams: createDefaultTeams(),
    status: 'playing',
    players: [
      { id: 'host', name: 'Host', score: 0, turns: 0, teamId: 'honey' },
      { id: 'h2', name: 'Honey Two', score: 0, turns: 0, teamId: 'honey' },
      { id: 'b1', name: 'Blue One', score: 0, turns: 0, teamId: 'blue' },
      { id: 'b2', name: 'Blue Two', score: 0, turns: 0, teamId: 'blue' },
    ],
    playerOrder: ['host', 'b1', 'h2', 'b2'],
    turnIndex: 0,
    currentTurn: null,
    faceOff: {
      id: 'face-1', kind: 'round', round: 1, status: 'steal',
      representativeIds: ['host', 'b1'], judgeId: 'h2', category: 'Bay & Beyond',
      categoryOptions: [], wordId: 'bay-1', buzzedPlayerId: 'host', attemptPlayerId: 'b1',
      ...faceOff,
    },
    faceOffHistory: [], faceOffRotationOffset: 0, premiumBank: null,
    roundUsedPlayerIds: [], openingCategory: null, bonusGame: null,
    history: [], usedWordIds: ['bay-1'], revision: 1, createdAt: 1, updatedAt: 1,
  }
}

describe('face-off recovery state', () => {
  it('restarts a normal face-off after a double miss without awarding score or control', () => {
    const room = roomWith()
    const next = applyFaceOffRulingState(room, false, { bank: cards, random: () => 0 })

    expect(next.faceOff?.status).toBe('ready')
    expect(next.faceOff?.wordId).toBe('bay-2')
    expect(next.faceOff?.representativeIds).toEqual(['host', 'b1'])
    expect(next.premiumBank).toBeNull()
    expect(next.teams.map((team) => team.score)).toEqual([0, 0])
    expect(next.faceOffHistory.at(-1)?.outcome).toBe('double-miss')
  })

  it('treats no buzz and replacement as auditable voids with fresh words', () => {
    const open = roomWith({ status: 'open', attemptPlayerId: undefined })
    const next = replaceFaceOffWordState(open, 'no-buzz', { bank: cards, random: () => 0 })

    expect(next.faceOff?.wordId).toBe('bay-2')
    expect(next.faceOff?.notice).toContain('No buzz')
    expect(next.faceOffHistory.at(-1)?.reason).toBe('no-buzz')
    expect(next.usedWordIds).toEqual(['bay-1', 'bay-2'])
  })

  it('rotates representatives after a sudden-death double miss', () => {
    const suddenDeath = roomWith({ kind: 'tiebreak', round: 1, representativeIds: ['h2', 'b2'], judgeId: 'host', attemptPlayerId: 'b2' })
    const next = applyFaceOffRulingState(suddenDeath, false, { bank: cards, random: () => 0 })

    expect(next.faceOff?.representativeIds).toEqual(['host', 'b1'])
    expect(next.faceOff?.judgeId).not.toBe('host')
  })

  it('undoes a winning ruling exactly before continuing to Premium Bank', () => {
    const attempt = roomWith({ status: 'attempt', attemptPlayerId: 'host' })
    const won = applyFaceOffRulingState(attempt, true, { bank: cards })

    expect(won.faceOff?.status).toBe('result')
    expect(won.teams[0].score).toBe(2)
    expect(won.premiumBank?.controllingTeamId).toBe('honey')

    const undone = undoFaceOffRulingState(won)
    expect(undone.faceOff?.status).toBe('attempt')
    expect(undone.teams[0].score).toBe(0)
    expect(undone.premiumBank).toBeNull()
    expect(undone.faceOffHistory).toEqual([])

    const continued = continueFaceOffResultState(won)
    expect(continued.faceOff).toBeNull()
    expect(continued.premiumBank?.controllingTeamId).toBe('honey')
  })

  it('pauses an exhausted category and resumes only with an available category', () => {
    const base = roomWith({ status: 'ready', wordId: null })
    const usedRoom = { ...base, usedWordIds: ['bay-1', 'bay-2'] }
    const exhausted = {
      ...usedRoom,
      ...createFaceOffState(usedRoom, 1, 'round', {
        category: 'Bay & Beyond', representativeIds: ['host', 'b1'], judgeId: 'h2', bank: cards,
      }),
    }
    expect(exhausted.faceOff?.status).toBe('exhausted')
    expect(exhausted.faceOff?.categoryOptions).toContain('Internet Brain')

    const resumed = chooseExhaustedFaceOffCategoryState(exhausted, 'Internet Brain', { bank: cards, random: () => 0 })
    expect(resumed.faceOff?.status).toBe('ready')
    expect(resumed.faceOff?.wordId).toBe('net-1')
  })

  it('restores the first attempt when an incorrect ruling is undone', () => {
    const attempt = roomWith({ status: 'attempt', attemptPlayerId: 'host' })
    const steal = applyFaceOffRulingState(attempt, false, { bank: cards })
    expect(steal.faceOff?.status).toBe('steal')
    expect(steal.faceOff?.attemptPlayerId).toBe('b1')
    expect(undoFaceOffRulingState(steal).faceOff?.attemptPlayerId).toBe('host')
  })
})
