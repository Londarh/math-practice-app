import { describe, expect, it } from 'vitest'
import { makeAttempt, makeSession } from '../test/fixtures'
import {
  accuracyOf,
  addAttemptToStatistics,
  calculateStatistics,
  emptyStatistics,
  recentSessions,
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
