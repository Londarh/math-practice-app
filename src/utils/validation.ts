import { CHOICE_COUNT } from '../services/answerChoices'
import {
  DEFAULT_SETTINGS,
  MAX_MASTERY_THRESHOLD,
  MIN_MASTERY_THRESHOLD,
} from '../services/defaultSettings'
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
  PracticeSession,
  SessionLength,
  SessionResult,
} from '../types/session'
import type { MistakePattern } from '../types/mistake'
import type { AppSettings } from '../types/settings'
import type { AppStatistics, OperationStatistics } from '../types/statistics'
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

/**
 * Checks data that arrives from outside the component tree (router state)
 * and returns a clean config, or null if it is unusable.
 */
export function parsePracticeConfig(value: unknown): PracticeConfig | null {
  if (!isRecord(value)) return null
  const { operations, difficulty, sessionLength, reviewPatterns } = value

  if (!Array.isArray(operations) || operations.length === 0) return null
  if (!operations.every(isMathOperation)) return null
  if (!isDifficultyLevel(difficulty)) return null
  if (!isSessionLength(sessionLength)) return null

  const config: PracticeConfig = {
    operations: ALL_OPERATIONS.filter((op) => operations.includes(op)),
    difficulty,
    sessionLength,
  }

  if (reviewPatterns !== undefined) {
    if (
      !Array.isArray(reviewPatterns) ||
      reviewPatterns.length === 0 ||
      !reviewPatterns.every(isMistakePattern)
    ) {
      return null
    }
    config.reviewPatterns = reviewPatterns.map((pattern) => ({ ...pattern }))
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

export function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

export function isPracticeAttempt(value: unknown): value is PracticeAttempt {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.questionId === 'string' &&
    isMathOperation(value.operation) &&
    Number.isInteger(value.firstOperand) &&
    Number.isInteger(value.secondOperand) &&
    Number.isInteger(value.correctAnswer) &&
    Number.isInteger(value.selectedAnswer) &&
    typeof value.selfReportedCorrect === 'boolean' &&
    isDifficultyLevel(value.difficulty) &&
    (value.source === 'regular' || value.source === 'mistake-review') &&
    isTimestamp(value.attemptedAt) &&
    typeof value.sessionId === 'string' &&
    (value.mistakePatternId === undefined ||
      typeof value.mistakePatternId === 'string')
  )
}

export function isPracticeSession(value: unknown): value is PracticeSession {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isTimestamp(value.startedAt) &&
    (value.completedAt === undefined || isTimestamp(value.completedAt)) &&
    Array.isArray(value.operations) &&
    value.operations.length > 0 &&
    value.operations.every(isMathOperation) &&
    isDifficultyLevel(value.difficulty) &&
    isSessionLength(value.sessionLength) &&
    isCount(value.attempted) &&
    isCount(value.correct) &&
    isCount(value.incorrect) &&
    Number(value.correct) + Number(value.incorrect) === value.attempted &&
    (value.mode === undefined ||
      value.mode === 'regular' ||
      value.mode === 'mistake-review')
  )
}

/**
 * Parses a stored list. A value that is not a list is unusable (null); single
 * broken records inside a list are dropped so the rest can still be used.
 */
export function parseRecordList<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): T[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(isItem)
}

export const parseStoredAttempts = (value: unknown) =>
  parseRecordList(value, isPracticeAttempt)

export const parseStoredSessions = (value: unknown) =>
  parseRecordList(value, isPracticeSession)

export function isMistakePattern(value: unknown): value is MistakePattern {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isMathOperation(value.operation) ||
    !Number.isInteger(value.firstOperand) ||
    !Number.isInteger(value.secondOperand) ||
    !isDifficultyLevel(value.difficulty) ||
    !isCount(value.incorrectCount) ||
    Number(value.incorrectCount) < 1 ||
    !isCount(value.similarCorrectCount) ||
    !isTimestamp(value.lastIncorrectAt) ||
    typeof value.mastered !== 'boolean'
  ) {
    return false
  }
  // The stored answer must really be the answer, e.g. no division by zero.
  const answer = computeAnswer(
    value.operation,
    Number(value.firstOperand),
    Number(value.secondOperand),
  )
  return Number.isInteger(answer) && value.correctAnswer === answer
}

export const parseStoredMistakePatterns = (value: unknown) =>
  parseRecordList(value, isMistakePattern)

function isCounts(value: unknown): value is OperationStatistics {
  return (
    isRecord(value) &&
    isCount(value.attempted) &&
    isCount(value.correct) &&
    isCount(value.incorrect) &&
    Number(value.correct) + Number(value.incorrect) === value.attempted
  )
}

/**
 * Parses stored aggregate statistics. Totals that do not add up are treated
 * as corrupted, so they can be rebuilt from the stored attempts.
 */
export function parseStatistics(value: unknown): AppStatistics | null {
  if (!isCounts(value)) return null
  const { byOperation, byDifficulty, reviewAttempted, reviewCorrect } =
    value as unknown as Record<string, unknown>
  if (!isRecord(byOperation) || !isRecord(byDifficulty)) return null
  if (!ALL_OPERATIONS.every((op) => isCounts(byOperation[op]))) return null
  if (!ALL_DIFFICULTIES.every((level) => isCounts(byDifficulty[level]))) {
    return null
  }
  if (!isCount(reviewAttempted) || !isCount(reviewCorrect)) return null
  if (Number(reviewCorrect) > Number(reviewAttempted)) return null

  const pick = (counts: OperationStatistics): OperationStatistics => ({
    attempted: counts.attempted,
    correct: counts.correct,
    incorrect: counts.incorrect,
  })
  return {
    ...pick(value),
    byOperation: Object.fromEntries(
      ALL_OPERATIONS.map((op) => [
        op,
        pick(byOperation[op] as OperationStatistics),
      ]),
    ) as AppStatistics['byOperation'],
    byDifficulty: Object.fromEntries(
      ALL_DIFFICULTIES.map((level) => [
        level,
        pick(byDifficulty[level] as OperationStatistics),
      ]),
    ) as AppStatistics['byDifficulty'],
    reviewAttempted: Number(reviewAttempted),
    reviewCorrect: Number(reviewCorrect),
  }
}

export function isMasteryThreshold(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= MIN_MASTERY_THRESHOLD &&
    Number(value) <= MAX_MASTERY_THRESHOLD
  )
}

/**
 * Parses stored settings field by field: a broken field falls back to its
 * default instead of throwing away every setting.
 */
export function parseSettings(value: unknown): AppSettings | null {
  if (!isRecord(value)) return null
  const defaults = DEFAULT_SETTINGS
  const bool = (key: keyof AppSettings, fallback: boolean) =>
    typeof value[key] === 'boolean' ? (value[key] as boolean) : fallback
  const operations = value.defaultOperations

  return {
    soundEnabled: bool('soundEnabled', defaults.soundEnabled),
    cardAnimationEnabled: bool(
      'cardAnimationEnabled',
      defaults.cardAnimationEnabled,
    ),
    showExplanations: bool('showExplanations', defaults.showExplanations),
    defaultSessionLength: isSessionLength(value.defaultSessionLength)
      ? value.defaultSessionLength
      : defaults.defaultSessionLength,
    defaultDifficulty: isDifficultyLevel(value.defaultDifficulty)
      ? value.defaultDifficulty
      : defaults.defaultDifficulty,
    defaultOperations:
      Array.isArray(operations) &&
      operations.length > 0 &&
      operations.every(isMathOperation)
        ? ALL_OPERATIONS.filter((op) => operations.includes(op))
        : [...defaults.defaultOperations],
    masteryThreshold: isMasteryThreshold(value.masteryThreshold)
      ? value.masteryThreshold
      : defaults.masteryThreshold,
  }
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
    !attempts.every(isPracticeAttempt)
  ) {
    return null
  }
  return value as unknown as SessionResult
}

/** Checks a question restored from storage, including the spec 18 rules. */
export function isValidQuestion(value: unknown): value is Question {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.displayText !== 'string' ||
    !Number.isInteger(value.firstOperand) ||
    !Number.isInteger(value.secondOperand) ||
    !Array.isArray(value.choices) ||
    (value.source !== 'regular' && value.source !== 'mistake-review') ||
    (value.mistakePatternId !== undefined &&
      typeof value.mistakePatternId !== 'string')
  ) {
    return false
  }
  return validateQuestion(value as unknown as Question).length === 0
}
