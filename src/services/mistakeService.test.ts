import { describe, expect, it } from 'vitest'
import { makeAttempt, makePattern } from '../test/fixtures'
import type { MistakePattern } from '../types/mistake'
import {
  applyAttemptToPatterns,
  applyMasteryThreshold,
  buildReviewConfig,
  createMistakePattern,
  factKey,
  findPattern,
  isActivePattern,
  prioritizePatterns,
  recordMistake,
  reviewPriority,
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

const THRESHOLD = 3

const review = (patternId: string, correct: boolean) =>
  makeAttempt({
    operation: 'division',
    firstOperand: 56,
    secondOperand: 7,
    correctAnswer: 8,
    source: 'mistake-review',
    mistakePatternId: patternId,
    selfReportedCorrect: correct,
    attemptedAt: '2026-10-21T12:00:00.000Z',
  })

describe('applyAttemptToPatterns', () => {
  it('ignores correct regular answers', () => {
    const patterns = recordMistake([], wrong())

    expect(
      applyAttemptToPatterns(
        patterns,
        wrong({ selfReportedCorrect: true }),
        THRESHOLD,
      ),
    ).toBe(patterns)
  })

  it('records incorrect regular answers', () => {
    expect(applyAttemptToPatterns([], wrong(), THRESHOLD)).toHaveLength(1)
  })

  it('counts a correct review answer for the original pattern', () => {
    const [pattern] = recordMistake([], wrong())

    const [updated] = applyAttemptToPatterns(
      [pattern],
      review(pattern.id, true),
      THRESHOLD,
    )

    expect(updated.similarCorrectCount).toBe(1)
    expect(updated.incorrectCount).toBe(1)
    expect(updated.mastered).toBe(false)
  })

  it('treats a wrong review answer as another miss of the original', () => {
    const [pattern] = recordMistake([], wrong())
    const progressed = { ...pattern, similarCorrectCount: 2 }

    const patterns = applyAttemptToPatterns(
      [progressed],
      review(pattern.id, false),
      THRESHOLD,
    )

    // No new pattern is made for the similar question itself.
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      incorrectCount: 2,
      similarCorrectCount: 1,
      lastIncorrectAt: '2026-10-21T12:00:00.000Z',
      mastered: false,
    })
  })

  it('never lets progress drop below zero', () => {
    const [pattern] = recordMistake([], wrong())

    const [updated] = applyAttemptToPatterns(
      [pattern],
      review(pattern.id, false),
      THRESHOLD,
    )

    expect(updated.similarCorrectCount).toBe(0)
  })

  it('falls back to normal tracking when the pattern no longer exists', () => {
    const patterns = applyAttemptToPatterns(
      [],
      review('deleted', false),
      THRESHOLD,
    )

    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      operation: 'division',
      firstOperand: 56,
    })
  })
})

describe('mastery transitions', () => {
  function reviewTimes(
    pattern: MistakePattern,
    results: boolean[],
    threshold = THRESHOLD,
  ) {
    return results.reduce(
      (patterns, correct) =>
        applyAttemptToPatterns(
          patterns,
          review(pattern.id, correct),
          threshold,
        ),
      [pattern],
    )[0]
  }

  it('becomes mastered after three correct similar answers', () => {
    const [pattern] = recordMistake([], wrong())

    expect(reviewTimes(pattern, [true, true]).mastered).toBe(false)
    expect(reviewTimes(pattern, [true, true, true]).mastered).toBe(true)
  })

  it('uses the configured threshold', () => {
    const [pattern] = recordMistake([], wrong())

    expect(reviewTimes(pattern, [true], 1).mastered).toBe(true)
    expect(reviewTimes(pattern, [true, true, true], 5).mastered).toBe(false)
    expect(
      reviewTimes(pattern, [true, true, true, true, true], 5).mastered,
    ).toBe(true)
  })

  it('a wrong review answer delays mastery', () => {
    const [pattern] = recordMistake([], wrong())

    const updated = reviewTimes(pattern, [true, true, false, true])

    expect(updated.similarCorrectCount).toBe(2)
    expect(updated.mastered).toBe(false)
  })

  it('a mastered pattern becomes active again after a new mistake', () => {
    const [pattern] = recordMistake([], wrong())
    const mastered = reviewTimes(pattern, [true, true, true])
    expect(isActivePattern(mastered)).toBe(false)

    const [again] = applyAttemptToPatterns([mastered], wrong(), THRESHOLD)

    expect(again.id).toBe(pattern.id)
    expect(again.mastered).toBe(false)
    expect(again.similarCorrectCount).toBe(0)
    expect(again.incorrectCount).toBe(2)
    expect(isActivePattern(again)).toBe(true)
  })

  it('re-checks mastery when the threshold changes', () => {
    const two = makePattern({ similarCorrectCount: 2 })
    const four = makePattern({ similarCorrectCount: 4, mastered: true })

    const lowered = applyMasteryThreshold([two, four], 2)
    expect(lowered.map((p) => p.mastered)).toEqual([true, true])

    const raised = applyMasteryThreshold([two, four], 5)
    expect(raised.map((p) => p.mastered)).toEqual([false, false])

    const unchanged = [two, four]
    expect(applyMasteryThreshold(unchanged, 3)).toBe(unchanged)
  })
})

describe('review priority', () => {
  const now = Date.parse('2026-10-21T12:00:00.000Z')
  const daysAgo = (days: number) =>
    new Date(now - days * 86_400_000).toISOString()

  it('ranks frequently missed patterns higher', () => {
    const often = makePattern({
      incorrectCount: 4,
      lastIncorrectAt: daysAgo(3),
    })
    const once = makePattern({ incorrectCount: 1, lastIncorrectAt: daysAgo(3) })

    expect(reviewPriority(often, now)).toBeGreaterThan(
      reviewPriority(once, now),
    )
    expect(prioritizePatterns([once, often], now)).toEqual([often, once])
  })

  it('ranks recently missed patterns higher', () => {
    const recent = makePattern({ lastIncorrectAt: daysAgo(0.5) })
    const week = makePattern({ lastIncorrectAt: daysAgo(5) })
    const old = makePattern({ lastIncorrectAt: daysAgo(60) })

    expect(prioritizePatterns([old, week, recent], now)).toEqual([
      recent,
      week,
      old,
    ])
  })

  it('ranks patterns with little successful review higher', () => {
    const at = daysAgo(3)
    const fresh = makePattern({ similarCorrectCount: 0, lastIncorrectAt: at })
    const some = makePattern({ similarCorrectCount: 1, lastIncorrectAt: at })
    const more = makePattern({ similarCorrectCount: 2, lastIncorrectAt: at })

    expect(prioritizePatterns([more, some, fresh], now)).toEqual([
      fresh,
      some,
      more,
    ])
  })

  it('leaves out mastered patterns', () => {
    const active = makePattern()
    const mastered = makePattern({ mastered: true, similarCorrectCount: 3 })

    expect(prioritizePatterns([mastered, active], now)).toEqual([active])
  })

  it('randomizes the order of patterns with equal priority', () => {
    const a = makePattern({ lastIncorrectAt: daysAgo(2) })
    const b = makePattern({ lastIncorrectAt: daysAgo(2) })
    const top = makePattern({ incorrectCount: 5, lastIncorrectAt: daysAgo(2) })
    const seconds = new Set<string>()
    for (const value of [0, 0.3, 0.6, 0.99]) {
      const order = prioritizePatterns([a, b, top], now, () => value)
      // The clear winner always comes first; the tie can go either way.
      expect(order[0]).toBe(top)
      seconds.add(order[1].id)
    }

    expect(seconds).toEqual(new Set([a.id, b.id]))
  })
})

describe('buildReviewConfig', () => {
  it('returns null when there is nothing to review', () => {
    expect(buildReviewConfig([], 10)).toBeNull()
    expect(buildReviewConfig([makePattern({ mastered: true })], 10)).toBeNull()
  })

  it('uses the highest-priority patterns, at most one per question', () => {
    const patterns = Array.from({ length: 8 }, (_, i) =>
      makePattern({ incorrectCount: i + 1 }),
    )

    const config = buildReviewConfig(patterns, 5)!

    expect(config.sessionLength).toBe(5)
    expect(config.reviewPatterns!.map((p) => p.incorrectCount)).toEqual([
      8, 7, 6, 5, 4,
    ])
  })

  it('mixes several mistakes and lists their operations', () => {
    const config = buildReviewConfig(
      [
        makePattern({ operation: 'multiplication', difficulty: 2 }),
        makePattern({
          operation: 'addition',
          firstOperand: 2,
          secondOperand: 3,
          correctAnswer: 5,
          difficulty: 1,
        }),
      ],
      'continuous',
    )!

    expect(config.reviewPatterns).toHaveLength(2)
    expect(config.operations).toEqual(['addition', 'multiplication'])
    expect(config.difficulty).toBe(2)
  })
})
