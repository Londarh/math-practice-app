import { describe, expect, it } from 'vitest'
import { makeAttempt, makePattern, makeSession } from '../test/fixtures'
import type { MistakePattern } from '../types/mistake'
import { computeAnswer } from '../utils/math'
import {
  accuracyOf,
  addAttemptToStatistics,
  calculateStatistics,
  emptyStatistics,
  mostMissedOperations,
  recentSessions,
  sortByIncorrectCount,
  summarizeMistakes,
} from './statisticsService'

describe('calculateStatistics', () => {
  it('returns all zeros, and 0% accuracy, for zero attempts', () => {
    const stats = calculateStatistics([])

    expect(stats).toEqual(emptyStatistics())
    expect(stats.attempted).toBe(0)
    expect(accuracyOf(stats)).toBe(0)
    expect(accuracyOf(stats.byOperation.division)).toBe(0)
    expect(accuracyOf(stats.byDifficulty[4])).toBe(0)
  })

  it('counts totals and accuracy', () => {
    const stats = calculateStatistics([
      makeAttempt(),
      makeAttempt(),
      makeAttempt(),
      makeAttempt({ selfReportedCorrect: false }),
    ])

    expect(stats.attempted).toBe(4)
    expect(stats.correct).toBe(3)
    expect(stats.incorrect).toBe(1)
    expect(accuracyOf(stats)).toBe(75)
  })

  it('handles all correct and all incorrect', () => {
    const right = calculateStatistics([makeAttempt(), makeAttempt()])
    const wrong = calculateStatistics([
      makeAttempt({ selfReportedCorrect: false }),
      makeAttempt({ selfReportedCorrect: false }),
    ])

    expect(accuracyOf(right)).toBe(100)
    expect(accuracyOf(wrong)).toBe(0)
    expect(wrong.incorrect).toBe(2)
  })

  it('tracks every operation separately', () => {
    const stats = calculateStatistics([
      makeAttempt({ operation: 'addition' }),
      makeAttempt({ operation: 'subtraction', selfReportedCorrect: false }),
      makeAttempt({ operation: 'multiplication' }),
      makeAttempt({ operation: 'multiplication', selfReportedCorrect: false }),
      makeAttempt({ operation: 'division' }),
    ])

    expect(stats.byOperation.addition).toEqual({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(stats.byOperation.subtraction).toEqual({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
    expect(accuracyOf(stats.byOperation.multiplication)).toBe(50)
    expect(accuracyOf(stats.byOperation.division)).toBe(100)
  })

  it('tracks every difficulty level separately', () => {
    const stats = calculateStatistics([
      makeAttempt({ difficulty: 1 }),
      makeAttempt({ difficulty: 2, selfReportedCorrect: false }),
      makeAttempt({ difficulty: 3 }),
      makeAttempt({ difficulty: 3 }),
      makeAttempt({ difficulty: 3, selfReportedCorrect: false }),
      makeAttempt({ difficulty: 4 }),
    ])

    expect(stats.byDifficulty[1].attempted).toBe(1)
    expect(accuracyOf(stats.byDifficulty[2])).toBe(0)
    expect(stats.byDifficulty[3]).toEqual({
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
    expect(accuracyOf(stats.byDifficulty[3])).toBe(67)
    expect(accuracyOf(stats.byDifficulty[4])).toBe(100)
  })

  it('counts mistake-review questions', () => {
    const stats = calculateStatistics([
      makeAttempt({ source: 'mistake-review' }),
      makeAttempt({ source: 'mistake-review', selfReportedCorrect: false }),
      makeAttempt(),
    ])

    expect(stats.reviewAttempted).toBe(2)
    expect(stats.reviewCorrect).toBe(1)
  })
})

describe('addAttemptToStatistics', () => {
  it('does not change the statistics it was given', () => {
    const before = emptyStatistics()

    const after = addAttemptToStatistics(before, makeAttempt())

    expect(before.attempted).toBe(0)
    expect(before.byOperation.addition.attempted).toBe(0)
    expect(after.attempted).toBe(1)
  })
})

describe('recentSessions', () => {
  it('sorts sessions from newest to oldest and skips empty ones', () => {
    const sessions = [
      makeSession({ id: 'old', startedAt: '2026-10-01T10:00:00.000Z' }),
      makeSession({ id: 'new', startedAt: '2026-10-20T10:00:00.000Z' }),
      makeSession({
        id: 'empty',
        startedAt: '2026-10-21T10:00:00.000Z',
        attempted: 0,
        correct: 0,
      }),
      makeSession({ id: 'mid', startedAt: '2026-10-10T10:00:00.000Z' }),
    ]

    expect(recentSessions(sessions).map((s) => s.id)).toEqual([
      'new',
      'mid',
      'old',
    ])
    expect(recentSessions(sessions, 1).map((s) => s.id)).toEqual(['new'])
  })
})

describe('mistake statistics', () => {
  const fact = (
    operation: MistakePattern['operation'],
    first: number,
    second: number,
    overrides: Partial<MistakePattern> = {},
  ) =>
    makePattern({
      operation,
      firstOperand: first,
      secondOperand: second,
      correctAnswer: computeAnswer(operation, first, second),
      ...overrides,
    })

  it('sorts mistakes by how often they were missed', () => {
    const once = fact('addition', 2, 3, { incorrectCount: 1 })
    const often = fact('division', 56, 7, { incorrectCount: 5 })
    const twice = fact('subtraction', 9, 4, { incorrectCount: 2 })

    expect(sortByIncorrectCount([once, often, twice])).toEqual([
      often,
      twice,
      once,
    ])
  })

  it('breaks ties by the most recent miss, then by a fixed order', () => {
    const older = fact('addition', 2, 3, {
      incorrectCount: 2,
      lastIncorrectAt: '2026-10-01T10:00:00.000Z',
    })
    const newer = fact('addition', 4, 4, {
      incorrectCount: 2,
      lastIncorrectAt: '2026-10-20T10:00:00.000Z',
    })
    const sameTimeA = fact('addition', 1, 1, { incorrectCount: 1 })
    const sameTimeB = fact('addition', 1, 2, { incorrectCount: 1 })

    expect(sortByIncorrectCount([older, newer])).toEqual([newer, older])
    expect(sortByIncorrectCount([sameTimeB, sameTimeA])).toEqual(
      sortByIncorrectCount([sameTimeA, sameTimeB]),
    )
  })

  it('finds the most frequently missed operation', () => {
    const result = mostMissedOperations([
      fact('multiplication', 8, 7, { incorrectCount: 2 }),
      fact('multiplication', 6, 7, { incorrectCount: 2 }),
      fact('addition', 2, 3, { incorrectCount: 3 }),
    ])

    expect(result).toEqual({ operations: ['multiplication'], misses: 4 })
  })

  it('returns every operation that is tied for most missed', () => {
    const result = mostMissedOperations([
      fact('division', 56, 7, { incorrectCount: 2 }),
      fact('subtraction', 9, 4, { incorrectCount: 2 }),
    ])

    expect(result).toEqual({
      operations: ['subtraction', 'division'],
      misses: 2,
    })
  })

  it('reports nothing when there are no mistakes', () => {
    expect(mostMissedOperations([])).toEqual({ operations: [], misses: 0 })
    const summary = summarizeMistakes([], emptyStatistics())
    expect(summary.active).toEqual([])
    expect(summary.mastered).toEqual([])
    expect(summary.frequentFacts).toEqual([])
  })

  it('summarizes active, mastered and review counts', () => {
    const active = fact('addition', 2, 3, { incorrectCount: 4 })
    const mastered = fact('addition', 5, 5, {
      mastered: true,
      similarCorrectCount: 3,
    })
    const stats = calculateStatistics([
      makeAttempt({ source: 'mistake-review' }),
      makeAttempt({ source: 'mistake-review', selfReportedCorrect: false }),
      makeAttempt(),
    ])

    const summary = summarizeMistakes([mastered, active], stats, 1)

    expect(summary.active).toEqual([active])
    expect(summary.mastered).toEqual([mastered])
    expect(summary.similarPracticed).toBe(2)
    expect(summary.reviewCorrect).toBe(1)
    expect(summary.frequentFacts).toEqual([active])
  })
})
