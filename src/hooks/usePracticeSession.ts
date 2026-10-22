import { useCallback, useReducer } from 'react'
import {
  createQuestion,
  generateQuestionForOperations,
} from '../services/questionGenerator'
import type { Question } from '../types/question'
import type {
  PracticeAttempt,
  PracticeConfig,
  PracticeSession,
  ReviewItem,
} from '../types/session'
import { createId } from '../utils/ids'

/** Tries to find a different question before allowing an immediate repeat. */
export const MAX_REPEAT_AVOIDANCE_ATTEMPTS = 10

export interface PracticeSessionState {
  config: PracticeConfig
  session: PracticeSession
  currentQuestion: Question | null
  /** Zero-based index of the question being shown. */
  currentQuestionIndex: number
  attempts: PracticeAttempt[]
  isActive: boolean
  /** Friendly message when a question could not be generated. */
  error: string | null
}

export type PracticeSessionAction =
  | {
      type: 'record'
      questionId: string
      selectedAnswer: number
      correct: boolean
      attemptId: string
      attemptedAt: string
      nextQuestion: Question | null
      error?: string
    }
  | { type: 'end'; completedAt: string }

/** Number of questions in the session, or null for continuous practice. */
export function sessionTotal(config: PracticeConfig): number | null {
  if (config.reviewItems) return config.reviewItems.length
  return config.sessionLength === 'continuous' ? null : config.sessionLength
}

/**
 * Picks the question after `attemptedCount` answers, or null when a
 * fixed-length session is finished. May throw if generation fails.
 */
export function nextQuestionFor(
  config: PracticeConfig,
  attemptedCount: number,
  previous: Question | null,
): Question | null {
  const total = sessionTotal(config)
  if (total !== null && attemptedCount >= total) return null

  if (config.reviewItems) {
    const item = config.reviewItems[attemptedCount]
    return createQuestion({
      ...item,
      difficulty: config.difficulty,
      source: 'mistake-review',
    })
  }

  let question = generateQuestionForOperations(
    config.operations,
    config.difficulty,
  )
  for (
    let attempt = 1;
    previous &&
    question.displayText === previous.displayText &&
    attempt < MAX_REPEAT_AVOIDANCE_ATTEMPTS;
    attempt++
  ) {
    question = generateQuestionForOperations(
      config.operations,
      config.difficulty,
    )
  }
  return question
}

const GENERATION_ERROR =
  'Oops! We could not make a question right now. Please try different options.'

export function createInitialState(
  config: PracticeConfig,
): PracticeSessionState {
  let currentQuestion: Question | null = null
  let error: string | null = null
  try {
    currentQuestion = nextQuestionFor(config, 0, null)
  } catch {
    error = GENERATION_ERROR
  }
  return {
    config,
    session: {
      id: createId('session'),
      startedAt: new Date().toISOString(),
      operations: config.operations,
      difficulty: config.difficulty,
      sessionLength: config.reviewItems
        ? config.reviewItems.length
        : config.sessionLength,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    },
    currentQuestion,
    currentQuestionIndex: 0,
    attempts: [],
    isActive: error === null,
    error,
  }
}

export function practiceSessionReducer(
  state: PracticeSessionState,
  action: PracticeSessionAction,
): PracticeSessionState {
  switch (action.type) {
    case 'record': {
      const question = state.currentQuestion
      // Ignore stale or repeated clicks so each question counts only once.
      if (
        !state.isActive ||
        !question ||
        question.id !== action.questionId ||
        state.attempts.some((a) => a.questionId === question.id)
      ) {
        return state
      }

      const attempt: PracticeAttempt = {
        id: action.attemptId,
        questionId: question.id,
        operation: question.operation,
        firstOperand: question.firstOperand,
        secondOperand: question.secondOperand,
        correctAnswer: question.correctAnswer,
        selectedAnswer: action.selectedAnswer,
        selfReportedCorrect: action.correct,
        difficulty: question.difficulty,
        source: question.source,
        attemptedAt: action.attemptedAt,
        sessionId: state.session.id,
      }
      const session: PracticeSession = {
        ...state.session,
        attempted: state.session.attempted + 1,
        correct: state.session.correct + (action.correct ? 1 : 0),
        incorrect: state.session.incorrect + (action.correct ? 0 : 1),
      }
      const finished = action.nextQuestion === null
      if (finished) session.completedAt = action.attemptedAt

      return {
        ...state,
        session,
        attempts: [...state.attempts, attempt],
        currentQuestion: action.nextQuestion,
        currentQuestionIndex: finished
          ? state.currentQuestionIndex
          : state.currentQuestionIndex + 1,
        isActive: !finished,
        error: action.error ?? null,
      }
    }
    case 'end': {
      if (!state.isActive) return state
      return {
        ...state,
        session: { ...state.session, completedAt: action.completedAt },
        isActive: false,
      }
    }
  }
}

/** Runs one practice session: the current question, totals and attempts. */
export function usePracticeSession(config: PracticeConfig) {
  const [state, dispatch] = useReducer(
    practiceSessionReducer,
    config,
    createInitialState,
  )

  const recordResult = useCallback(
    (selectedAnswer: number, correct: boolean) => {
      const { currentQuestion, session, isActive } = state
      if (!isActive || !currentQuestion) return

      // Generate outside the reducer so the reducer stays pure.
      let nextQuestion: Question | null = null
      let error: string | undefined
      try {
        nextQuestion = nextQuestionFor(
          state.config,
          session.attempted + 1,
          currentQuestion,
        )
      } catch {
        error = GENERATION_ERROR
      }

      dispatch({
        type: 'record',
        questionId: currentQuestion.id,
        selectedAnswer,
        correct,
        attemptId: createId('attempt'),
        attemptedAt: new Date().toISOString(),
        nextQuestion,
        error,
      })
    },
    [state],
  )

  const endSession = useCallback(() => {
    dispatch({ type: 'end', completedAt: new Date().toISOString() })
  }, [])

  return {
    ...state,
    totalQuestions: sessionTotal(state.config),
    recordResult,
    endSession,
  }
}

/** The facts marked wrong in a session, without duplicates, in order. */
export function reviewItemsFromAttempts(
  attempts: readonly PracticeAttempt[],
): ReviewItem[] {
  const seen = new Set<string>()
  const items: ReviewItem[] = []
  for (const attempt of attempts) {
    if (attempt.selfReportedCorrect) continue
    const key = `${attempt.operation}:${attempt.firstOperand}:${attempt.secondOperand}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      operation: attempt.operation,
      firstOperand: attempt.firstOperand,
      secondOperand: attempt.secondOperand,
    })
  }
  return items
}
