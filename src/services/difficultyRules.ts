import type { DifficultyLevel, MathOperation } from '../types/question'

/** Inclusive number range. */
export interface NumberRange {
  min: number
  max: number
}

export interface AdditionRule {
  operand: NumberRange
  /** Largest allowed sum, when the level limits it. */
  maxResult?: number
}

export interface SubtractionRule {
  operand: NumberRange
}

/** One allowed factor combination, e.g. "one-digit × two-digit". */
export interface FactorShape {
  first: NumberRange
  second: NumberRange
}

export interface MultiplicationRule {
  shapes: FactorShape[]
}

/**
 * Division is generated from divisor × quotient (spec section 9), so the
 * answer is always a whole number and the divisor is never zero.
 */
export interface DivisionRule {
  divisor: NumberRange
  quotient: NumberRange
  /** Extra limit on the dividend, when the level sets one. */
  dividend?: NumberRange
}

const oneDigit: NumberRange = { min: 1, max: 9 }
const twoDigit: NumberRange = { min: 10, max: 99 }

/** Difficulty rules from specification section 7. */
export const DIFFICULTY_RULES: {
  addition: Record<DifficultyLevel, AdditionRule>
  subtraction: Record<DifficultyLevel, SubtractionRule>
  multiplication: Record<DifficultyLevel, MultiplicationRule>
  division: Record<DifficultyLevel, DivisionRule>
} = {
  addition: {
    1: { operand: { min: 0, max: 10 }, maxResult: 20 },
    2: { operand: { min: 0, max: 50 }, maxResult: 100 },
    3: { operand: { min: 0, max: 100 } },
    // "Multiple-digit addition": both numbers have at least two digits.
    4: { operand: { min: 10, max: 1000 } },
  },
  subtraction: {
    1: { operand: { min: 0, max: 10 } },
    2: { operand: { min: 0, max: 50 } },
    3: { operand: { min: 0, max: 100 } },
    4: { operand: { min: 10, max: 1000 } },
  },
  multiplication: {
    1: { shapes: [{ first: { min: 0, max: 5 }, second: { min: 0, max: 5 } }] },
    2: {
      shapes: [{ first: { min: 0, max: 10 }, second: { min: 0, max: 10 } }],
    },
    3: {
      shapes: [
        { first: oneDigit, second: oneDigit },
        { first: oneDigit, second: twoDigit },
      ],
    },
    4: {
      shapes: [
        { first: twoDigit, second: { min: 2, max: 9 } },
        { first: twoDigit, second: twoDigit },
      ],
    },
  },
  division: {
    1: { divisor: { min: 1, max: 5 }, quotient: { min: 0, max: 5 } },
    2: { divisor: { min: 1, max: 10 }, quotient: { min: 0, max: 10 } },
    // 12 × 12 = 144, the spec's largest level-3 dividend.
    3: { divisor: { min: 1, max: 12 }, quotient: { min: 0, max: 12 } },
    // "Larger dividends" than level 3, with one- or two-digit divisors.
    4: {
      divisor: { min: 2, max: 20 },
      quotient: { min: 2, max: 99 },
      dividend: { min: 145, max: 1000 },
    },
  },
}

/** Subtraction may go below zero only at level 4, and only when enabled. */
export function negativesAllowed(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  allowNegativeSubtraction = false,
): boolean {
  return (
    operation === 'subtraction' && difficulty === 4 && allowNegativeSubtraction
  )
}

export function inRange(value: number, range: NumberRange): boolean {
  return Number.isInteger(value) && value >= range.min && value <= range.max
}

/** Checks that a question's numbers follow the rules for its level. */
export function matchesDifficulty(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  first: number,
  second: number,
  allowNegativeSubtraction = false,
): boolean {
  switch (operation) {
    case 'addition': {
      const rule = DIFFICULTY_RULES.addition[difficulty]
      return (
        inRange(first, rule.operand) &&
        inRange(second, rule.operand) &&
        (rule.maxResult === undefined || first + second <= rule.maxResult)
      )
    }
    case 'subtraction': {
      const rule = DIFFICULTY_RULES.subtraction[difficulty]
      return (
        inRange(first, rule.operand) &&
        inRange(second, rule.operand) &&
        (first >= second ||
          negativesAllowed(operation, difficulty, allowNegativeSubtraction))
      )
    }
    case 'multiplication': {
      const { shapes } = DIFFICULTY_RULES.multiplication[difficulty]
      return shapes.some(
        (shape) =>
          (inRange(first, shape.first) && inRange(second, shape.second)) ||
          (inRange(first, shape.second) && inRange(second, shape.first)),
      )
    }
    case 'division': {
      const rule = DIFFICULTY_RULES.division[difficulty]
      if (!inRange(second, rule.divisor) || second === 0) return false
      const quotient = first / second
      return (
        inRange(quotient, rule.quotient) &&
        (rule.dividend === undefined || inRange(first, rule.dividend))
      )
    }
  }
}
