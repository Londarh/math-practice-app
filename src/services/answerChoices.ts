import type { MathOperation } from '../types/question'
import { randomInt, type RandomSource } from '../utils/math'
import { shuffle } from '../utils/shuffle'

/** Every question shows this many answers: one correct, the rest wrong. */
export const CHOICE_COUNT = 4

/** Random tries before falling back to simple "answer + n" choices. */
export const MAX_DISTRACTOR_ATTEMPTS = 50

export interface ChoiceOptions {
  random?: RandomSource
  /** Whether wrong answers may be below zero (spec 8.2). */
  allowNegative?: boolean
}

/** Adds column by column but forgets to carry, e.g. 27 + 15 → 32. */
export function sumWithoutCarry(a: number, b: number): number {
  let result = 0
  let place = 1
  while (a > 0 || b > 0) {
    result += (((a % 10) + (b % 10)) % 10) * place
    a = Math.floor(a / 10)
    b = Math.floor(b / 10)
    place *= 10
  }
  return result
}

/**
 * Subtracts the smaller digit from the larger in every column instead of
 * borrowing, e.g. 52 − 17 → 45.
 */
export function differenceWithoutBorrow(a: number, b: number): number {
  let result = 0
  let place = 1
  while (a > 0 || b > 0) {
    result += Math.abs((a % 10) - (b % 10)) * place
    a = Math.floor(a / 10)
    b = Math.floor(b / 10)
    place *= 10
  }
  return result
}

/** Wrong answers that come from typical mistakes for each operation. */
export function operationDistractors(
  operation: MathOperation,
  first: number,
  second: number,
  answer: number,
): number[] {
  // Off-by-ten slips only make sense once the answer has a tens digit.
  const tensSlips = Math.abs(answer) >= 10 ? [answer + 10, answer - 10] : []
  switch (operation) {
    case 'addition':
      return [
        sumWithoutCarry(first, second),
        ...tensSlips,
        answer + 1,
        answer - 1,
      ]
    case 'subtraction':
      return [
        differenceWithoutBorrow(first, second),
        ...tensSlips,
        answer + 1,
        answer - 1,
      ]
    case 'multiplication':
      // Neighbouring facts from the times table, e.g. 8 × 7 → 48, 64, 49, 63.
      return [
        (first - 1) * second,
        (first + 1) * second,
        first * (second - 1),
        first * (second + 1),
        first + second,
      ]
    case 'division': {
      // Same fact family: 56 ÷ 7 = 8 might be mixed up with 7 or 9.
      const candidates = [answer - 1, answer + 1, second, answer + 2]
      if (second > 2 && first % (second - 1) === 0) {
        candidates.push(first / (second - 1))
      }
      if (first % (second + 1) === 0) candidates.push(first / (second + 1))
      return candidates
    }
  }
}

/** Small changes to the answer, scaled to its size. */
export function nearbyDistractors(answer: number): number[] {
  const offsets = [1, 2, 3, 4, 5]
  if (Math.abs(answer) >= 20) offsets.push(10, 20)
  if (Math.abs(answer) >= 200) offsets.push(100)
  return offsets.flatMap((offset) => [answer - offset, answer + offset])
}

/** Wrong answers must stay close enough to the real answer to be believable. */
export function isPlausible(choice: number, answer: number): boolean {
  return Math.abs(choice - answer) <= Math.max(10, Math.abs(answer))
}

/** Picks the wrong answers for a question. Always returns exactly three. */
export function generateDistractors(
  operation: MathOperation,
  first: number,
  second: number,
  answer: number,
  options: ChoiceOptions = {},
): number[] {
  const random = options.random ?? Math.random
  const allowNegative = options.allowNegative ?? false
  const needed = CHOICE_COUNT - 1
  const chosen = new Set<number>()

  const tryAdd = (value: number) => {
    if (
      chosen.size < needed &&
      Number.isInteger(value) &&
      value !== answer &&
      (allowNegative || value >= 0) &&
      isPlausible(value, answer)
    ) {
      chosen.add(value)
    }
  }

  // Typical mistakes first, then small nudges, each in random order.
  shuffle(
    operationDistractors(operation, first, second, answer),
    random,
  ).forEach(tryAdd)
  shuffle(nearbyDistractors(answer), random).forEach(tryAdd)

  // Random nearby numbers, with a retry limit so this can never loop forever.
  const spread = Math.max(5, Math.round(Math.abs(answer) * 0.1))
  for (
    let attempt = 0;
    chosen.size < needed && attempt < MAX_DISTRACTOR_ATTEMPTS;
    attempt++
  ) {
    tryAdd(answer + randomInt(-spread, spread, random))
  }

  // Last resort: counting up from the answer always finds unused numbers.
  for (let offset = 1; chosen.size < needed; offset++) {
    chosen.add(answer + offset)
  }

  return [...chosen]
}

/** Combines the correct answer with the wrong ones in a random order. */
export function buildChoices(
  operation: MathOperation,
  first: number,
  second: number,
  answer: number,
  options: ChoiceOptions = {},
): number[] {
  const distractors = generateDistractors(
    operation,
    first,
    second,
    answer,
    options,
  )
  return shuffle([answer, ...distractors], options.random)
}
