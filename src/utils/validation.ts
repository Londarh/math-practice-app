import type { DifficultyLevel, MathOperation } from '../types/question'
import type {
  PracticeConfig,
  ReviewItem,
  SessionLength,
} from '../types/session'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from './labels'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isMathOperation(value: unknown): value is MathOperation {
  return ALL_OPERATIONS.includes(value as MathOperation)
}

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return ALL_DIFFICULTIES.includes(value as DifficultyLevel)
}

export function isSessionLength(value: unknown): value is SessionLength {
  return (
    value === 'continuous' ||
    (typeof value === 'number' && Number.isInteger(value) && value > 0)
  )
}

function isReviewItem(value: unknown): value is ReviewItem {
  return (
    isRecord(value) &&
    isMathOperation(value.operation) &&
    Number.isInteger(value.firstOperand) &&
    Number.isInteger(value.secondOperand)
  )
}

/**
 * Checks data that arrives from outside the component tree (router state,
 * later local storage) and returns a clean config, or null if it is unusable.
 */
export function parsePracticeConfig(value: unknown): PracticeConfig | null {
  if (!isRecord(value)) return null
  const { operations, difficulty, sessionLength, reviewItems } = value

  if (!Array.isArray(operations) || operations.length === 0) return null
  if (!operations.every(isMathOperation)) return null
  if (!isDifficultyLevel(difficulty)) return null
  if (!isSessionLength(sessionLength)) return null

  const config: PracticeConfig = {
    operations: ALL_OPERATIONS.filter((op) => operations.includes(op)),
    difficulty,
    sessionLength,
  }

  if (reviewItems !== undefined) {
    if (
      !Array.isArray(reviewItems) ||
      reviewItems.length === 0 ||
      !reviewItems.every(isReviewItem)
    ) {
      return null
    }
    config.reviewItems = reviewItems.map((item) => ({
      operation: item.operation,
      firstOperand: item.firstOperand,
      secondOperand: item.secondOperand,
    }))
  }

  return config
}
