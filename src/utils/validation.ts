import { CHOICE_COUNT } from '../services/answerChoices'
import {
  matchesDifficulty,
  negativesAllowed,
} from '../services/difficultyRules'
import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import type {
  PracticeAttempt,
  PracticeConfig,
  ReviewItem,
  SessionLength,
  SessionResult,
} from '../types/session'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from './labels'
import { computeAnswer } from './math'

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

export interface QuestionValidationOptions {
  allowNegativeSubtraction?: boolean
}

/**
 * Checks a question against the validation rules in spec section 18.
 * Returns a list of problems; an empty list means the question is valid.
 */
export function validateQuestion(
  question: Question,
  options: QuestionValidationOptions = {},
): string[] {
  const errors: string[] = []
  const { operation, firstOperand, secondOperand, correctAnswer, difficulty } =
    question

  if (!isMathOperation(operation)) {
    return [`Unsupported operation: ${String(operation)}`]
  }
  if (!isDifficultyLevel(difficulty)) {
    return [`Unsupported difficulty: ${String(difficulty)}`]
  }
  if (operation === 'division' && secondOperand === 0) {
    errors.push('Division by zero')
  }
  if (!Number.isInteger(correctAnswer)) {
    errors.push(`Answer is not a whole number: ${correctAnswer}`)
  } else if (
    correctAnswer !== computeAnswer(operation, firstOperand, secondOperand)
  ) {
    errors.push(`Answer ${correctAnswer} is wrong for ${question.displayText}`)
  }
  if (
    !matchesDifficulty(
      operation,
      difficulty,
      firstOperand,
      secondOperand,
      options.allowNegativeSubtraction,
    )
  ) {
    errors.push(`${question.displayText} does not match level ${difficulty}`)
  }

  const { choices } = question
  if (choices.length !== CHOICE_COUNT) {
    errors.push(`Expected ${CHOICE_COUNT} choices, got ${choices.length}`)
  }
  if (new Set(choices).size !== choices.length) {
    errors.push('Answer choices are not unique')
  }
  if (choices.filter((choice) => choice === correctAnswer).length !== 1) {
    errors.push('The correct answer must appear exactly once')
  }
  if (!choices.every(Number.isInteger)) {
    errors.push('Answer choices must be whole numbers')
  }
  if (
    !negativesAllowed(
      operation,
      difficulty,
      options.allowNegativeSubtraction,
    ) &&
    choices.some((choice) => choice < 0)
  ) {
    errors.push('Negative answer choices are not allowed at this level')
  }
  return errors
}

const isCount = (value: unknown) =>
  Number.isInteger(value) && Number(value) >= 0

function isAttempt(value: unknown): value is PracticeAttempt {
  return (
    isRecord(value) &&
    typeof value.questionId === 'string' &&
    isMathOperation(value.operation) &&
    Number.isInteger(value.firstOperand) &&
    Number.isInteger(value.secondOperand) &&
    Number.isInteger(value.correctAnswer) &&
    typeof value.selfReportedCorrect === 'boolean' &&
    (value.source === 'regular' || value.source === 'mistake-review')
  )
}

/** Checks the finished-session data handed to the summary page. */
export function parseSessionResult(value: unknown): SessionResult | null {
  if (!isRecord(value)) return null
  const config = parsePracticeConfig(value.config)
  const { session, attempts } = value
  if (!config || !isRecord(session) || !Array.isArray(attempts)) return null
  if (
    typeof session.id !== 'string' ||
    !isCount(session.attempted) ||
    !isCount(session.correct) ||
    !isCount(session.incorrect) ||
    !attempts.every(isAttempt)
  ) {
    return null
  }
  return value as unknown as SessionResult
}
