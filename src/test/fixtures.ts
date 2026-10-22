import type { PracticeAttempt, PracticeSession } from '../types/session'

let counter = 0

export function makeAttempt(
  overrides: Partial<PracticeAttempt> = {},
): PracticeAttempt {
  counter += 1
  return {
    id: `attempt-${counter}`,
    questionId: `question-${counter}`,
    operation: 'addition',
    firstOperand: 2,
    secondOperand: 3,
    correctAnswer: 5,
    selectedAnswer: 5,
    selfReportedCorrect: true,
    difficulty: 1,
    source: 'regular',
    attemptedAt: '2026-10-21T10:00:00.000Z',
    sessionId: 'session-1',
    ...overrides,
  }
}

export function makeSession(
  overrides: Partial<PracticeSession> = {},
): PracticeSession {
  return {
    id: 'session-1',
    startedAt: '2026-10-21T09:55:00.000Z',
    operations: ['addition'],
    difficulty: 1,
    sessionLength: 5,
    attempted: 1,
    correct: 1,
    incorrect: 0,
    ...overrides,
  }
}
