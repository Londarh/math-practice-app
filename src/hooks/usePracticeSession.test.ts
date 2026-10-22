import { describe, expect, it } from 'vitest'
import type { PracticeConfig } from '../types/session'
import {
  createInitialState,
  nextQuestionFor,
  practiceSessionReducer,
  sessionTotal,
  type PracticeSessionState,
} from './usePracticeSession'

const config: PracticeConfig = {
  operations: ['addition', 'subtraction'],
  difficulty: 2,
  sessionLength: 5,
}

function record(
  state: PracticeSessionState,
  correct: boolean,
  questionId = state.currentQuestion!.id,
) {
  return practiceSessionReducer(state, {
    type: 'record',
    questionId,
    selectedAnswer: state.currentQuestion!.choices[0],
    correct,
    attemptId: `attempt-${state.attempts.length}`,
    attemptedAt: '2026-10-21T10:00:00.000Z',
    nextQuestion: nextQuestionFor(
      state.config,
      state.session.attempted + 1,
      state.currentQuestion,
    ),
  })
}

describe('createInitialState', () => {
  it('stores the session settings and the first question', () => {
    const state = createInitialState(config)

    expect(state.session.id).toMatch(/^session-/)
    expect(state.session.operations).toEqual(['addition', 'subtraction'])
    expect(state.session.difficulty).toBe(2)
    expect(state.session.sessionLength).toBe(5)
    expect(state.session).toMatchObject({
      attempted: 0,
      correct: 0,
      incorrect: 0,
    })
    expect(state.currentQuestionIndex).toBe(0)
    expect(state.isActive).toBe(true)
    expect(['addition', 'subtraction']).toContain(
      state.currentQuestion?.operation,
    )
    expect(state.currentQuestion?.difficulty).toBe(2)
  })
})

describe('practiceSessionReducer', () => {
  it('records a right answer and moves to the next question', () => {
    const start = createInitialState(config)
    const next = record(start, true)

    expect(next.session).toMatchObject({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(next.currentQuestionIndex).toBe(1)
    expect(next.currentQuestion?.id).not.toBe(start.currentQuestion?.id)
    expect(next.attempts[0]).toMatchObject({
      questionId: start.currentQuestion?.id,
      selfReportedCorrect: true,
      sessionId: start.session.id,
      operation: start.currentQuestion?.operation,
      correctAnswer: start.currentQuestion?.correctAnswer,
    })
  })

  it('records a wrong answer', () => {
    const next = record(createInitialState(config), false)

    expect(next.session).toMatchObject({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
    expect(next.attempts[0].selfReportedCorrect).toBe(false)
  })

  it('ignores a second result for the same question', () => {
    const start = createInitialState(config)
    const once = record(start, true)
    const twice = record(once, false, start.currentQuestion!.id)

    expect(twice).toBe(once)
    expect(twice.session.attempted).toBe(1)
  })

  it('finishes after the chosen number of questions', () => {
    let state = createInitialState(config)
    for (let i = 0; i < 5; i++) state = record(state, i % 2 === 0)

    expect(state.isActive).toBe(false)
    expect(state.currentQuestion).toBeNull()
    expect(state.session).toMatchObject({
      attempted: 5,
      correct: 3,
      incorrect: 2,
    })
    expect(state.session.completedAt).toBe('2026-10-21T10:00:00.000Z')
    expect(state.attempts).toHaveLength(5)
  })

  it('keeps going for continuous practice until ended', () => {
    let state = createInitialState({ ...config, sessionLength: 'continuous' })
    for (let i = 0; i < 30; i++) state = record(state, true)

    expect(state.isActive).toBe(true)
    expect(state.currentQuestion).not.toBeNull()

    state = practiceSessionReducer(state, {
      type: 'end',
      completedAt: '2026-10-21T11:00:00.000Z',
    })
    expect(state.isActive).toBe(false)
    expect(state.session.completedAt).toBe('2026-10-21T11:00:00.000Z')
    expect(state.session.attempted).toBe(30)
  })

  it('ignores results after the session has ended', () => {
    const start = createInitialState({ ...config, sessionLength: 'continuous' })
    const ended = practiceSessionReducer(start, {
      type: 'end',
      completedAt: '2026-10-21T11:00:00.000Z',
    })

    expect(record(ended, true)).toBe(ended)
  })
})

describe('nextQuestionFor', () => {
  it('does not repeat the same question twice in a row', () => {
    const level1: PracticeConfig = {
      operations: ['multiplication'],
      difficulty: 1,
      sessionLength: 'continuous',
    }
    let previous = nextQuestionFor(level1, 0, null)
    for (let i = 1; i < 300; i++) {
      const next = nextQuestionFor(level1, i, previous)
      expect(next?.displayText).not.toBe(previous?.displayText)
      previous = next
    }
  })

  it('returns null once a fixed session is complete', () => {
    expect(nextQuestionFor(config, 5, null)).toBeNull()
  })

  it('replays review items in order as mistake-review questions', () => {
    const review: PracticeConfig = {
      ...config,
      reviewItems: [
        { operation: 'multiplication', firstOperand: 7, secondOperand: 8 },
        { operation: 'division', firstOperand: 56, secondOperand: 7 },
      ],
    }

    expect(sessionTotal(review)).toBe(2)
    const first = nextQuestionFor(review, 0, null)
    const second = nextQuestionFor(review, 1, first)
    expect(first).toMatchObject({
      displayText: '7 × 8 = ?',
      correctAnswer: 56,
      source: 'mistake-review',
    })
    expect(second).toMatchObject({
      displayText: '56 ÷ 7 = ?',
      correctAnswer: 8,
    })
    expect(nextQuestionFor(review, 2, second)).toBeNull()
  })
})
