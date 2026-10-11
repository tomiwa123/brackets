import { describe, expect, it } from 'vitest'
import { difficultyForRound, drawWord, nextTurn, pointsForRound, roundForTurn } from './gameEngine'
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
      playerOrder: ['a', 'b'], turnIndex: 4, revision: 5,
    } as SpellingRoom
    expect(nextTurn(room).status).toBe('playing')
    expect(nextTurn({ ...room, turnIndex: 5 }).status).toBe('finished')
  })
})
