import type { MistakePattern } from './mistake'
import type { DifficultyLevel, MathOperation, QuestionSource } from './question'

export type SessionLength = number | 'continuous'

/** Regular practice, or similar questions built from earlier mistakes. */
export type PracticeMode = 'regular' | 'mistake-review'

/** The options chosen on the setup page, used to start a practice session. */
export interface PracticeConfig {
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  /**
   * When present, this is a mistake-review session: questions are similar
   * questions built from these patterns, taken in this (priority) order.
   */
  reviewPatterns?: MistakePattern[]
}

export interface PracticeAttempt {
  id: string
  questionId: string
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  correctAnswer: number
  selectedAnswer: number
  selfReportedCorrect: boolean
  difficulty: DifficultyLevel
  source: QuestionSource
  /** ISO 8601 timestamp */
  attemptedAt: string
  sessionId: string
  /** For mistake-review questions: the pattern the question came from. */
  mistakePatternId?: string
}

export interface PracticeSession {
  id: string
  /** ISO 8601 timestamp */
  startedAt: string
  /** ISO 8601 timestamp */
  completedAt?: string
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  attempted: number
  correct: number
  incorrect: number
  mode?: PracticeMode
}

/** What the practice page hands to the summary page when a session ends. */
export interface SessionResult {
  config: PracticeConfig
  session: PracticeSession
  attempts: PracticeAttempt[]
}
