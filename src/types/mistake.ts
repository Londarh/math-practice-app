import type { DifficultyLevel, MathOperation } from './question'

export interface MistakePattern {
  id: string
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  correctAnswer: number
  difficulty: DifficultyLevel
  incorrectCount: number
  similarCorrectCount: number
  /** ISO 8601 timestamp */
  lastIncorrectAt: string
  mastered: boolean
}
