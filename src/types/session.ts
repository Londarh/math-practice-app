import type { DifficultyLevel, MathOperation, QuestionSource } from './question'

export type SessionLength = number | 'continuous'

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
