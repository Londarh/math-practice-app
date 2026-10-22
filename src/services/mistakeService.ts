import type { MistakePattern } from '../types/mistake'
import type { MathOperation } from '../types/question'
import type { PracticeAttempt } from '../types/session'
import { createId } from '../utils/ids'

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

/** Updates mistake patterns for one attempt. Correct answers change nothing. */
export function applyAttemptToPatterns(
  patterns: MistakePattern[],
  attempt: PracticeAttempt,
): MistakePattern[] {
  if (attempt.selfReportedCorrect) return patterns
  return recordMistake(patterns, attempt)
}

export const isActivePattern = (pattern: MistakePattern) => !pattern.mastered
