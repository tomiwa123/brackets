import { describe, expect, it } from 'vitest'
import { WORD_BANK } from './words'

describe('spelling word bank', () => {
  it('has a balanced, unique MVP bank', () => {
    expect(WORD_BANK).toHaveLength(150)
    expect(new Set(WORD_BANK.map((card) => card.id)).size).toBe(150)
    expect(new Set(WORD_BANK.map((card) => card.word.toLowerCase())).size).toBe(150)
    for (const difficulty of ['warmup', 'tricky', 'menace']) {
      expect(WORD_BANK.filter((card) => card.difficulty === difficulty)).toHaveLength(50)
    }
  })

  it('includes every required card field', () => {
    WORD_BANK.forEach((card) => {
      expect(card.word.length).toBeGreaterThan(1)
      expect(card.pronunciation.length).toBeGreaterThan(1)
      expect(card.definition.length).toBeGreaterThan(5)
      expect(card.origin.length).toBeGreaterThan(5)
      expect(card.sentence).not.toContain(card.word)
    })
  })
})
