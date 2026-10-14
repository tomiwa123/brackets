import { describe, expect, it } from 'vitest'
import { WORD_BANK } from './words'

describe('spelling word bank', () => {
  it('has a balanced, unique MVP bank', () => {
    expect(WORD_BANK).toHaveLength(180)
    expect(new Set(WORD_BANK.map((card) => card.id)).size).toBe(180)
    expect(new Set(WORD_BANK.map((card) => card.word.toLowerCase())).size).toBe(180)
    for (const difficulty of ['warmup', 'tricky', 'menace']) {
      expect(WORD_BANK.filter((card) => card.difficulty === difficulty)).toHaveLength(60)
    }
    for (const category of ['Bay & Beyond', 'Internet Brain', 'Passport Stamps', 'Sound & Screen', 'Science & Nature']) {
      expect(WORD_BANK.filter((card) => card.category === category)).toHaveLength(36)
      for (const difficulty of ['warmup', 'tricky', 'menace']) {
        expect(WORD_BANK.filter((card) => card.category === category && card.difficulty === difficulty)).toHaveLength(12)
      }
    }
    expect(WORD_BANK.some((card) => String(card.category) === 'Words That Sound Fake')).toBe(false)
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
