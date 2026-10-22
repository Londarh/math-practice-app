import { describe, expect, it } from 'vitest'
import { makePattern } from '../test/fixtures'
import type { Question } from '../types/question'
import type { PracticeConfig } from '../types/session'
import { validateQuestion } from '../utils/validation'
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

  it('builds review questions from the patterns in turn', () => {
    const times = makePattern({ id: 'times' })
    const minus = makePattern({
      id: 'minus',
      operation: 'subtraction',
      firstOperand: 9,
      secondOperand: 4,
      correctAnswer: 5,
      difficulty: 1,
    })
    const review: PracticeConfig = {
      ...config,
      sessionLength: 3,
      reviewPatterns: [times, minus],
    }

    expect(sessionTotal(review)).toBe(3)
    const questions = [0, 1, 2].map((i) => nextQuestionFor(review, i, null)!)
    expect(questions.map((q) => q.mistakePatternId)).toEqual([
      'times',
      'minus',
      'times',
    ])
    for (const q of questions) {
      expect(q.source).toBe('mistake-review')
      expect(validateQuestion(q)).toEqual([])
    }
    expect(nextQuestionFor(review, 3, questions[2])).toBeNull()
  })

  it('does not repeat recent review questions when it can avoid it', () => {
    const review: PracticeConfig = {
      ...config,
      sessionLength: 'continuous',
      reviewPatterns: [makePattern()],
    }
    const shown: Question[] = []
    for (let i = 0; i < 4; i++) {
      shown.push(nextQuestionFor(review, i, shown.at(-1) ?? null, shown)!)
    }

    expect(new Set(shown.map((q) => q.displayText)).size).toBe(4)
  })
})

describe('mistake-review sessions', () => {
  it('marks the session as a review and links attempts to patterns', () => {
    const pattern = makePattern({ id: 'p1' })
    let state = createInitialState({
      ...config,
      reviewPatterns: [pattern],
    })
    expect(state.session.mode).toBe('mistake-review')

    state = record(state, true)

    expect(state.attempts[0]).toMatchObject({
      source: 'mistake-review',
      mistakePatternId: 'p1',
    })
  })

  it('regular sessions have no pattern link', () => {
    let state = createInitialState(config)
    expect(state.session.mode).toBe('regular')

    state = record(state, false)

    expect(state.attempts[0].mistakePatternId).toBeUndefined()
  })
})
