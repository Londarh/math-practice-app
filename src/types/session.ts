import type { DifficultyLevel, MathOperation, QuestionSource } from './question'

export type SessionLength = number | 'continuous'

/** A question fact to practice again, taken from an earlier mistake. */
export interface ReviewItem {
  operation: MathOperation
  firstOperand: number
  secondOperand: number
}

/** The options chosen on the setup page, used to start a practice session. */
export interface PracticeConfig {
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  /** When present, the session replays these facts instead of random ones. */
  reviewItems?: ReviewItem[]
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
}

/** What the practice page hands to the summary page when a session ends. */
export interface SessionResult {
  config: PracticeConfig
  session: PracticeSession
  attempts: PracticeAttempt[]
}
