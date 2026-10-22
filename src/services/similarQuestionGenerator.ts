import type { MistakePattern } from '../types/mistake'
import type { MathOperation, Question } from '../types/question'
import { computeAnswer, type RandomSource } from '../utils/math'
import { shuffle } from '../utils/shuffle'
import { validateQuestion } from '../utils/validation'
import { matchesDifficulty } from './difficultyRules'
import { createQuestion, generateQuestion } from './questionGenerator'

export type SimilarityStrategy = 'nearby' | 'reversed' | 'fact-family'

export interface SimilarCandidate {
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  strategy: SimilarityStrategy
}

export interface SimilarQuestionOptions {
  random?: RandomSource
  /** Questions shown recently (see `questionKey`), tried last. */
  avoid?: ReadonlySet<string>
}

/** Identifies one exact question, operand order included. */
export function questionKey(
  operation: MathOperation,
  first: number,
  second: number,
): string {
  return `${operation}:${first}:${second}`
}

type Pair = [first: number, second: number]

/** The same operation with one number moved a little, e.g. 8 × 7 → 8 × 6. */
export function nearbyPairs(pattern: MistakePattern): Pair[] {
  const { operation, firstOperand: a, secondOperand: b } = pattern
  switch (operation) {
    case 'addition':
    case 'subtraction':
      return [1, -1, 2, -2].flatMap((d): Pair[] => [
        [a + d, b],
        [a, b + d],
      ])
    case 'multiplication':
      return [1, -1].flatMap((d): Pair[] => [
        [a + d, b],
        [a, b + d],
      ])
    case 'division': {
      // Change the answer or the divisor, so the result stays a whole number:
      // 56 ÷ 7 → 49 ÷ 7, 63 ÷ 7, 48 ÷ 6, 64 ÷ 8.
      const quotient = a / b
      return [1, -1].flatMap((d): Pair[] => [
        [b * (quotient + d), b],
        [(b + d) * quotient, b + d],
      ])
    }
  }
}

/**
 * The operands swapped, only where that is the same fact (8 × 7 → 7 × 8).
 * 9 − 3 and 3 − 9 are different questions, so subtraction and division have none.
 */
export function reversedPairs(pattern: MistakePattern): Pair[] {
  const { operation, firstOperand: a, secondOperand: b } = pattern
  if (operation !== 'addition' && operation !== 'multiplication') return []
  return a === b ? [] : [[b, a]]
}

/** Related inverse facts, e.g. 8 × 7 = 56 → 56 ÷ 7 and 56 ÷ 8. */
export function factFamily(
  pattern: MistakePattern,
): { operation: MathOperation; pair: Pair }[] {
  const { operation, firstOperand: a, secondOperand: b } = pattern
  const answer = computeAnswer(operation, a, b)
  switch (operation) {
    case 'addition':
      return [
        { operation: 'subtraction', pair: [answer, a] },
        { operation: 'subtraction', pair: [answer, b] },
      ]
    case 'subtraction':
      return [
        { operation: 'addition', pair: [answer, b] },
        { operation: 'addition', pair: [b, answer] },
      ]
    case 'multiplication':
      return [
        { operation: 'division', pair: [answer, a] },
        { operation: 'division', pair: [answer, b] },
      ]
    case 'division':
      return [
        { operation: 'multiplication', pair: [b, answer] },
        { operation: 'multiplication', pair: [answer, b] },
      ]
  }
}

/**
 * Every valid similar question for a pattern: at the pattern's difficulty,
 * with a whole-number answer, without duplicates and never the original.
 */
export function similarCandidates(pattern: MistakePattern): SimilarCandidate[] {
  const { operation, difficulty } = pattern
  const raw: SimilarCandidate[] = [
    ...nearbyPairs(pattern).map(([first, second]) => ({
      operation,
      firstOperand: first,
      secondOperand: second,
      strategy: 'nearby' as const,
    })),
    ...reversedPairs(pattern).map(([first, second]) => ({
      operation,
      firstOperand: first,
      secondOperand: second,
      strategy: 'reversed' as const,
    })),
    ...factFamily(pattern).map(({ operation: op, pair: [first, second] }) => ({
      operation: op,
      firstOperand: first,
      secondOperand: second,
      strategy: 'fact-family' as const,
    })),
  ]

  const seen = new Set([
    questionKey(operation, pattern.firstOperand, pattern.secondOperand),
  ])
  return raw.filter((candidate) => {
    const key = questionKey(
      candidate.operation,
      candidate.firstOperand,
      candidate.secondOperand,
    )
    if (seen.has(key)) return false
    seen.add(key)
    return (
      Number.isInteger(
        computeAnswer(
          candidate.operation,
          candidate.firstOperand,
          candidate.secondOperand,
        ),
      ) &&
      matchesDifficulty(
        candidate.operation,
        difficulty,
        candidate.firstOperand,
        candidate.secondOperand,
      )
    )
  })
}

/** Candidates in the order to try them: a random strategy first, then the rest. */
function orderCandidates(
  candidates: SimilarCandidate[],
  random: RandomSource,
): SimilarCandidate[] {
  const strategies = shuffle(
    [...new Set(candidates.map((c) => c.strategy))],
    random,
  )
  return strategies.flatMap((strategy) =>
    shuffle(
      candidates.filter((c) => c.strategy === strategy),
      random,
    ),
  )
}

/**
 * Generates a question related to a past mistake, labelled `mistake-review`
 * and linked to the pattern. Recently shown questions are avoided when
 * anything else is available.
 */
export function generateSimilarQuestion(
  pattern: MistakePattern,
  options: SimilarQuestionOptions = {},
): Question {
  const random = options.random ?? Math.random
  const avoid = options.avoid ?? new Set<string>()
  const candidates = similarCandidates(pattern)
  const isFresh = (c: SimilarCandidate) =>
    !avoid.has(questionKey(c.operation, c.firstOperand, c.secondOperand))
  const ordered = [
    ...orderCandidates(candidates.filter(isFresh), random),
    ...orderCandidates(
      candidates.filter((c) => !isFresh(c)),
      random,
    ),
  ]

  const link = {
    difficulty: pattern.difficulty,
    source: 'mistake-review' as const,
    mistakePatternId: pattern.id,
  }
  for (const candidate of ordered) {
    const question = createQuestion(
      {
        operation: candidate.operation,
        firstOperand: candidate.firstOperand,
        secondOperand: candidate.secondOperand,
        ...link,
      },
      { random },
    )
    if (validateQuestion(question).length === 0) return question
  }

  // Nothing related fits the level (very rare): practice the same operation
  // at the same level instead, still linked to the pattern.
  const fallback = generateQuestion(pattern.operation, pattern.difficulty, {
    random,
  })
  return { ...fallback, ...link }
}
