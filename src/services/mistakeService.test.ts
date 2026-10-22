import { describe, expect, it } from 'vitest'
import { makeAttempt } from '../test/fixtures'
import {
  applyAttemptToPatterns,
  createMistakePattern,
  factKey,
  findPattern,
  recordMistake,
} from './mistakeService'

const wrong = (overrides = {}) =>
  makeAttempt({
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 7,
    correctAnswer: 56,
    selectedAnswer: 54,
    selfReportedCorrect: false,
    difficulty: 2,
    attemptedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  })

describe('factKey', () => {
  it('treats reversed addition and multiplication as the same fact', () => {
    expect(factKey('multiplication', 8, 7)).toBe(
      factKey('multiplication', 7, 8),
    )
    expect(factKey('addition', 3, 9)).toBe(factKey('addition', 9, 3))
  })

  it('keeps subtraction and division order', () => {
    expect(factKey('subtraction', 9, 3)).not.toBe(factKey('subtraction', 3, 9))
    expect(factKey('division', 56, 7)).not.toBe(factKey('division', 7, 56))
  })
})

describe('createMistakePattern', () => {
  it('stores the fact, level, date and starting counts', () => {
    const pattern = createMistakePattern(wrong())

    expect(pattern).toEqual({
      id: expect.stringMatching(/^mistake-/),
      operation: 'multiplication',
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
      difficulty: 2,
      incorrectCount: 1,
      similarCorrectCount: 0,
      lastIncorrectAt: '2026-10-20T10:00:00.000Z',
      mastered: false,
    })
  })
})

describe('recordMistake', () => {
  it('creates a pattern after the first incorrect answer', () => {
    const patterns = recordMistake([], wrong())

    expect(patterns).toHaveLength(1)
    expect(patterns[0].incorrectCount).toBe(1)
  })

  it('updates the existing pattern instead of creating a duplicate', () => {
    const first = recordMistake([], wrong())
    const later = '2026-10-21T08:00:00.000Z'

    const patterns = recordMistake(first, wrong({ attemptedAt: later }))

    expect(patterns).toHaveLength(1)
    expect(patterns[0].id).toBe(first[0].id)
    expect(patterns[0].incorrectCount).toBe(2)
    expect(patterns[0].lastIncorrectAt).toBe(later)
  })

  it('matches the reversed multiplication fact', () => {
    const first = recordMistake([], wrong())

    const patterns = recordMistake(
      first,
      wrong({ firstOperand: 7, secondOperand: 8 }),
    )

    expect(patterns).toHaveLength(1)
    expect(patterns[0].incorrectCount).toBe(2)
  })

  it('resets mastery progress when a fact is missed again', () => {
    const [pattern] = recordMistake([], wrong())
    const progressed = { ...pattern, similarCorrectCount: 3, mastered: true }

    const [updated] = recordMistake([progressed], wrong())

    expect(updated.similarCorrectCount).toBe(0)
    expect(updated.mastered).toBe(false)
  })

  it('keeps different facts as separate patterns', () => {
    let patterns = recordMistake([], wrong())
    patterns = recordMistake(
      patterns,
      wrong({
        operation: 'division',
        firstOperand: 56,
        secondOperand: 7,
        correctAnswer: 8,
      }),
    )

    expect(patterns).toHaveLength(2)
    expect(findPattern(patterns, 'division', 56, 7)?.correctAnswer).toBe(8)
  })

  it('does not change the list it was given', () => {
    const original = recordMistake([], wrong())
    const copy = structuredClone(original)

    recordMistake(original, wrong())

    expect(original).toEqual(copy)
  })
})

describe('applyAttemptToPatterns', () => {
  it('ignores correct answers', () => {
    const patterns = recordMistake([], wrong())

    expect(
      applyAttemptToPatterns(patterns, wrong({ selfReportedCorrect: true })),
    ).toBe(patterns)
  })

  it('records incorrect answers', () => {
    expect(applyAttemptToPatterns([], wrong())).toHaveLength(1)
  })
})
