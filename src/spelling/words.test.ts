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
      expect(card.origin.length).toBeGreaterThan(30)
      expect(card.sentence.toLowerCase()).not.toContain(card.word.toLowerCase())
      expect(card.sentence.match(/___/g)).toHaveLength(1)
      expect(card.sentence.length).toBeGreaterThan(30)
    })
  })

  it('gives Team Showdown an exact 30% within-tier difficulty replacement', () => {
    for (const difficulty of ['warmup', 'tricky', 'menace'] as const) {
      const roundCards = WORD_BANK.filter((card) => card.difficulty === difficulty)
      expect(roundCards.filter((card) => card.teamSelectionWeight === 0)).toHaveLength(18)
      expect(roundCards.filter((card) => card.teamSelectionWeight === 1)).toHaveLength(24)
      expect(roundCards.filter((card) => card.teamSelectionWeight === 2)).toHaveLength(18)

      for (const category of ['Bay & Beyond', 'Internet Brain', 'Passport Stamps', 'Sound & Screen', 'Science & Nature'] as const) {
        const categoryCards = roundCards.filter((card) => card.category === category)
        expect(categoryCards.filter((card) => card.teamSelectionWeight === 0).length).toBeGreaterThanOrEqual(3)
        expect(categoryCards.filter((card) => card.teamSelectionWeight === 2).length).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('uses a distinct, contextual example for every word', () => {
    const sentences = WORD_BANK.map((card) => card.sentence)

    expect(new Set(sentences).size).toBe(WORD_BANK.length)
    expect(sentences).not.toContain("The room went quiet as tonight's speller considered ___.")
  })

  it('uses a distinct, word-specific origin for every word', () => {
    const origins = WORD_BANK.map((card) => card.origin)
    const answerLeaks = WORD_BANK
      .filter((card) => card.origin.toLowerCase().includes(card.word.toLowerCase()))
      .map((card) => card.word)

    expect(new Set(origins).size).toBe(WORD_BANK.length)
    expect(answerLeaks).toEqual([])
    expect(origins).not.toContain('Drawn from the language of place, landscape, and city life.')
    expect(origins).not.toContain('Part of the evolving vocabulary of technology and online culture.')
    expect(origins).not.toContain('A well-traveled word adopted or shaped across languages.')
    expect(origins).not.toContain('From the vocabulary of music, performance, film, or production.')
    expect(origins).not.toContain('From the vocabulary of the living world, Earth, and the wider universe.')
  })
})
