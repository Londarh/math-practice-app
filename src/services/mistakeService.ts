import type { MistakePattern } from '../types/mistake'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type {
  PracticeAttempt,
  PracticeConfig,
  SessionLength,
} from '../types/session'
import { createId } from '../utils/ids'
import { ALL_OPERATIONS } from '../utils/labels'
import type { RandomSource } from '../utils/math'
import { shuffle } from '../utils/shuffle'

/**
 * Identifies a number fact. Addition and multiplication facts are the same
 * either way round (8 × 7 and 7 × 8), so their operands are sorted first.
 */
export function factKey(
  operation: MathOperation,
  first: number,
  second: number,
): string {
  const commutative = operation === 'addition' || operation === 'multiplication'
  const [a, b] =
    commutative && first > second ? [second, first] : [first, second]
  return `${operation}:${a}:${b}`
}

export function findPattern(
  patterns: readonly MistakePattern[],
  operation: MathOperation,
  first: number,
  second: number,
): MistakePattern | undefined {
  const key = factKey(operation, first, second)
  return patterns.find(
    (p) => factKey(p.operation, p.firstOperand, p.secondOperand) === key,
  )
}

/** A new pattern for a question answered incorrectly for the first time. */
export function createMistakePattern(attempt: PracticeAttempt): MistakePattern {
  return {
    id: createId('mistake'),
    operation: attempt.operation,
    firstOperand: attempt.firstOperand,
    secondOperand: attempt.secondOperand,
    correctAnswer: attempt.correctAnswer,
    difficulty: attempt.difficulty,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: attempt.attemptedAt,
    mastered: false,
  }
}

/**
 * The same fact was missed again: count it, and start mastery over because
 * the earlier review clearly did not stick yet.
 */
export function repeatMistake(
  pattern: MistakePattern,
  attempt: PracticeAttempt,
): MistakePattern {
  return {
    ...pattern,
    difficulty: attempt.difficulty,
    incorrectCount: pattern.incorrectCount + 1,
    similarCorrectCount: 0,
    lastIncorrectAt: attempt.attemptedAt,
    mastered: false,
  }
}

/** Records an incorrect answer: updates its pattern, or creates one. */
export function recordMistake(
  patterns: readonly MistakePattern[],
  attempt: PracticeAttempt,
): MistakePattern[] {
  const existing = findPattern(
    patterns,
    attempt.operation,
    attempt.firstOperand,
    attempt.secondOperand,
  )
  if (!existing) return [...patterns, createMistakePattern(attempt)]
  return patterns.map((p) =>
    p.id === existing.id ? repeatMistake(p, attempt) : p,
  )
}

/**
 * A similar question was answered. Right answers count toward mastery; a wrong
 * one counts as another miss and takes back one step of progress.
 */
export function recordReviewAnswer(
  pattern: MistakePattern,
  attempt: PracticeAttempt,
  masteryThreshold: number,
): MistakePattern {
  if (attempt.selfReportedCorrect) {
    const similarCorrectCount = pattern.similarCorrectCount + 1
    return {
      ...pattern,
      similarCorrectCount,
      mastered: similarCorrectCount >= masteryThreshold,
    }
  }
  return {
    ...pattern,
    incorrectCount: pattern.incorrectCount + 1,
    similarCorrectCount: Math.max(0, pattern.similarCorrectCount - 1),
    lastIncorrectAt: attempt.attemptedAt,
    mastered: false,
  }
}

/**
 * Updates mistake patterns for one attempt. Review answers update the pattern
 * they came from; other wrong answers create or update a pattern.
 */
export function applyAttemptToPatterns(
  patterns: MistakePattern[],
  attempt: PracticeAttempt,
  masteryThreshold: number,
): MistakePattern[] {
  const source = attempt.mistakePatternId
    ? patterns.find((p) => p.id === attempt.mistakePatternId)
    : undefined
  if (source) {
    return patterns.map((p) =>
      p.id === source.id ? recordReviewAnswer(p, attempt, masteryThreshold) : p,
    )
  }
  if (attempt.selfReportedCorrect) return patterns
  return recordMistake(patterns, attempt)
}

/** Re-checks mastery after the threshold changes on the settings page. */
export function applyMasteryThreshold(
  patterns: MistakePattern[],
  masteryThreshold: number,
): MistakePattern[] {
  const changed = patterns.some(
    (p) => p.mastered !== p.similarCorrectCount >= masteryThreshold,
  )
  if (!changed) return patterns
  return patterns.map((p) => ({
    ...p,
    mastered: p.similarCorrectCount >= masteryThreshold,
  }))
}

export const isActivePattern = (pattern: MistakePattern) => !pattern.mastered

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Higher means review sooner: missed often, missed recently, and not yet
 * answered well in review. Each correct similar answer lowers it.
 */
export function reviewPriority(
  pattern: MistakePattern,
  now: number = Date.now(),
): number {
  const days = (now - Date.parse(pattern.lastIncorrectAt)) / DAY_MS
  const recency = days <= 1 ? 3 : days <= 7 ? 2 : days <= 30 ? 1 : 0
  const notReviewedYet = pattern.similarCorrectCount === 0 ? 2 : 0
  return (
    pattern.incorrectCount * 2 +
    recency +
    notReviewedYet -
    pattern.similarCorrectCount
  )
}

/**
 * Active patterns, highest priority first. Patterns with the same priority
 * come in random order, so review does not always start the same way.
 */
export function prioritizePatterns(
  patterns: readonly MistakePattern[],
  now: number = Date.now(),
  random: RandomSource = Math.random,
): MistakePattern[] {
  return shuffle(patterns.filter(isActivePattern), random)
    .map((pattern) => ({ pattern, priority: reviewPriority(pattern, now) }))
    .sort((a, b) => b.priority - a.priority)
    .map(({ pattern }) => pattern)
}

/**
 * Builds a mistake-review session from the most important active patterns,
 * or returns null when there is nothing to review. A session uses at most
 * one pattern per question so several mistakes get mixed together.
 */
export function buildReviewConfig(
  patterns: readonly MistakePattern[],
  sessionLength: SessionLength,
  now: number = Date.now(),
  random: RandomSource = Math.random,
): PracticeConfig | null {
  const prioritized = prioritizePatterns(patterns, now, random)
  if (prioritized.length === 0) return null
  const chosen =
    sessionLength === 'continuous'
      ? prioritized
      : prioritized.slice(0, sessionLength)
  return {
    operations: ALL_OPERATIONS.filter((op) =>
      chosen.some((p) => p.operation === op),
    ),
    difficulty: Math.max(...chosen.map((p) => p.difficulty)) as DifficultyLevel,
    sessionLength,
    reviewPatterns: chosen,
  }
}
