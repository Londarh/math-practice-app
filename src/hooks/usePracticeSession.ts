import { useCallback, useReducer } from 'react'
import { generateQuestionForOperations } from '../services/questionGenerator'
import {
  generateSimilarQuestion,
  questionKey,
} from '../services/similarQuestionGenerator'
import type { Question } from '../types/question'
import type {
  PracticeAttempt,
  PracticeConfig,
  PracticeSession,
} from '../types/session'
import { createId } from '../utils/ids'

/** Tries to find a different question before allowing an immediate repeat. */
export const MAX_REPEAT_AVOIDANCE_ATTEMPTS = 10

/** Mistake review avoids repeating any of this many recent questions. */
export const RECENT_REVIEW_QUESTIONS = 6

type ShownQuestion = Pick<
  Question,
  'operation' | 'firstOperand' | 'secondOperand'
>

const keyOf = (q: ShownQuestion) =>
  questionKey(q.operation, q.firstOperand, q.secondOperand)

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
  return config.sessionLength === 'continuous' ? null : config.sessionLength
}

/**
 * Picks the question after `attemptedCount` answers, or null when a
 * fixed-length session is finished. May throw if generation fails.
 * `recent` holds questions already shown, newest last.
 */
export function nextQuestionFor(
  config: PracticeConfig,
  attemptedCount: number,
  previous: Question | null,
  recent: readonly ShownQuestion[] = previous ? [previous] : [],
): Question | null {
  const total = sessionTotal(config)
  if (total !== null && attemptedCount >= total) return null

  if (config.reviewPatterns && config.reviewPatterns.length > 0) {
    // Take the patterns in turn, so one session mixes several mistakes.
    const patterns = config.reviewPatterns
    const pattern = patterns[attemptedCount % patterns.length]
    return generateSimilarQuestion(pattern, {
      avoid: new Set(recent.slice(-RECENT_REVIEW_QUESTIONS).map(keyOf)),
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
      sessionLength: config.sessionLength,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      mode: config.reviewPatterns ? 'mistake-review' : 'regular',
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
        ...(question.mistakePatternId && {
          mistakePatternId: question.mistakePatternId,
        }),
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
          // Attempts hold the same numbers as the questions already shown.
          [...state.attempts, currentQuestion],
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
