import type { MathOperation } from '../types/question'

/** Returns a number in [0, 1), like Math.random. Injectable for tests. */
export type RandomSource = () => number

/** Returns a random whole number between min and max, inclusive. */
export function randomInt(
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError(`randomInt needs whole numbers, got ${min}..${max}`)
  }
  if (min > max) {
    throw new RangeError(`randomInt range is empty: ${min}..${max}`)
  }
  return min + Math.floor(random() * (max - min + 1))
}

/** Picks one item from a non-empty list. */
export function randomItem<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T {
  if (items.length === 0) throw new RangeError('randomItem needs items')
  return items[randomInt(0, items.length - 1, random)]
}

/** The exact result of the operation, or NaN for division by zero. */
export function computeAnswer(
  operation: MathOperation,
  first: number,
  second: number,
): number {
  switch (operation) {
    case 'addition':
      return first + second
    case 'subtraction':
      return first - second
    case 'multiplication':
      return first * second
    case 'division':
      return second === 0 ? NaN : first / second
  }
}

/** correct / attempted × 100, rounded; 0 when nothing was attempted. */
export function calculateAccuracy(correct: number, attempted: number): number {
  if (attempted <= 0) return 0
  return Math.round((correct / attempted) * 100)
}
