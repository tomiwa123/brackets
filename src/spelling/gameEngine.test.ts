import { describe, expect, it } from 'vitest'
import { difficultyForRound, drawWord, eligibleTemporaryJudges, judgeIdForPlayer, nextTurn, pointsForRound, roundForTurn } from './gameEngine'
import type { SpellingRoom, WordCard } from './types'

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
    expect(drawWord(cards, 'Internet Brain', 'warmup', ['a'], () => 0).id).toBe('b')
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
})
