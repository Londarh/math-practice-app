import { describe, expect, it } from 'vitest'
import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import { validateQuestion } from '../utils/validation'
import {
  QuestionGenerationError,
  createQuestion,
  generateAdditionOperands,
  generateDivisionOperands,
  generateQuestion,
  generateQuestionForOperations,
  generateSubtractionOperands,
} from './questionGenerator'

const SAMPLES = 400
const levels: DifficultyLevel[] = [1, 2, 3, 4]
const operations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]

function sample(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  options?: Parameters<typeof generateQuestion>[2],
): Question[] {
  return Array.from({ length: SAMPLES }, () =>
    generateQuestion(operation, difficulty, options),
  )
}

const digits = (n: number) => String(Math.abs(n)).length

describe('generateQuestion: addition (spec 7)', () => {
  it.each([
    [1, 0, 10, 20],
    [2, 0, 50, 100],
    [3, 0, 100, Infinity],
    [4, 10, 1000, Infinity],
  ] as const)(
    'level %i uses numbers %i–%i with sums up to %s',
    (level, min, max, maxResult) => {
      for (const q of sample('addition', level)) {
        for (const n of [q.firstOperand, q.secondOperand]) {
          expect(n).toBeGreaterThanOrEqual(min)
          expect(n).toBeLessThanOrEqual(max)
        }
        expect(q.correctAnswer).toBe(q.firstOperand + q.secondOperand)
        expect(q.correctAnswer).toBeLessThanOrEqual(maxResult)
      }
    },
  )

  it('reaches the minimum and maximum operands', () => {
    expect(generateAdditionOperands(2, () => 0)).toEqual([0, 0])
    const [first, second] = generateAdditionOperands(2, () => 0.999999)
    expect(first).toBe(50)
    expect(first + second).toBeLessThanOrEqual(100)
  })

  it('formats the question text', () => {
    const q = createQuestion({
      operation: 'addition',
      firstOperand: 250,
      secondOperand: 1000,
      difficulty: 4,
    })
    expect(q.displayText).toBe('250 + 1,000 = ?')
  })
})

describe('generateQuestion: subtraction (spec 7)', () => {
  it.each([
    [1, 0, 10],
    [2, 0, 50],
    [3, 0, 100],
    [4, 10, 1000],
  ] as const)(
    'level %i uses numbers %i–%i and never goes negative',
    (level, min, max) => {
      for (const q of sample('subtraction', level)) {
        for (const n of [q.firstOperand, q.secondOperand]) {
          expect(n).toBeGreaterThanOrEqual(min)
          expect(n).toBeLessThanOrEqual(max)
        }
        expect(q.firstOperand).toBeGreaterThanOrEqual(q.secondOperand)
        expect(q.correctAnswer).toBe(q.firstOperand - q.secondOperand)
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0)
      }
    },
  )

  it('puts the larger number first even when the smaller is drawn first', () => {
    const values = [0, 0.999999]
    let i = 0
    const [first, second] = generateSubtractionOperands(1, () => values[i++])
    expect([first, second]).toEqual([10, 0])
  })

  it('allows negative answers only at level 4 when enabled', () => {
    const level4 = sample('subtraction', 4, { allowNegativeSubtraction: true })
    expect(level4.some((q) => q.correctAnswer < 0)).toBe(true)

    for (const level of [1, 2, 3] as const) {
      for (const q of sample('subtraction', level, {
        allowNegativeSubtraction: true,
      })) {
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('generateQuestion: multiplication (spec 7)', () => {
  it.each([1, 2] as const)('level %i keeps factors in range', (level) => {
    const max = level === 1 ? 5 : 10
    for (const q of sample('multiplication', level)) {
      for (const n of [q.firstOperand, q.secondOperand]) {
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(max)
      }
      expect(q.correctAnswer).toBe(q.firstOperand * q.secondOperand)
    }
  })

  it('level 3 uses one-digit × one-digit or one-digit × two-digit', () => {
    const questions = sample('multiplication', 3)
    for (const q of questions) {
      const lengths = [digits(q.firstOperand), digits(q.secondOperand)].sort()
      expect([
        [1, 1],
        [1, 2],
      ]).toContainEqual(lengths)
    }
    expect(questions.some((q) => digits(q.firstOperand) === 2)).toBe(true)
    expect(questions.some((q) => digits(q.secondOperand) === 2)).toBe(true)
  })

  it('level 4 uses two-digit × one-digit or two-digit × two-digit', () => {
    const questions = sample('multiplication', 4)
    for (const q of questions) {
      const lengths = [digits(q.firstOperand), digits(q.secondOperand)].sort()
      expect([
        [1, 2],
        [2, 2],
      ]).toContainEqual(lengths)
    }
    const bothTwoDigit = (q: Question) =>
      digits(q.firstOperand) === 2 && digits(q.secondOperand) === 2
    expect(questions.some(bothTwoDigit)).toBe(true)
    expect(questions.some((q) => !bothTwoDigit(q))).toBe(true)
  })
})

describe('generateQuestion: division (spec 7 and 9)', () => {
  it.each([
    [1, 5],
    [2, 10],
    [3, 12],
  ] as const)('level %i uses divisors 1–%i', (level, maxDivisor) => {
    for (const q of sample('division', level)) {
      expect(q.secondOperand).toBeGreaterThanOrEqual(1)
      expect(q.secondOperand).toBeLessThanOrEqual(maxDivisor)
    }
  })

  it('level 3 keeps dividends up to 144', () => {
    for (const q of sample('division', 3)) {
      expect(q.firstOperand).toBeLessThanOrEqual(144)
    }
  })

  it('level 4 uses larger dividends and one- or two-digit divisors', () => {
    const questions = sample('division', 4)
    for (const q of questions) {
      expect(q.firstOperand).toBeGreaterThan(144)
      expect(digits(q.secondOperand)).toBeLessThanOrEqual(2)
    }
    expect(questions.some((q) => q.secondOperand < 10)).toBe(true)
    expect(questions.some((q) => q.secondOperand >= 10)).toBe(true)
  })

  it.each(levels)(
    'level %i never divides by zero and gives whole answers',
    (level) => {
      for (const q of sample('division', level)) {
        expect(q.secondOperand).not.toBe(0)
        expect(Number.isInteger(q.correctAnswer)).toBe(true)
        expect(q.correctAnswer * q.secondOperand).toBe(q.firstOperand)
      }
    },
  )

  it('builds the dividend as divisor × quotient even at the extremes', () => {
    for (const r of [0, 0.5, 0.999999]) {
      for (const level of levels) {
        const [dividend, divisor] = generateDivisionOperands(level, () => r)
        expect(divisor).toBeGreaterThan(0)
        expect(dividend % divisor).toBe(0)
      }
    }
  })
})

describe('generateQuestion: general', () => {
  it.each(
    operations.flatMap((op) => levels.map((level) => [op, level] as const)),
  )('%s level %i produces valid questions', (operation, level) => {
    for (const q of sample(operation, level)) {
      expect(q.operation).toBe(operation)
      expect(q.difficulty).toBe(level)
      expect(q.source).toBe('regular')
      expect(q.id).toMatch(/^question-/)
      expect(validateQuestion(q)).toEqual([])
    }
  })

  it('throws a friendly error for unsupported operations', () => {
    expect(() => generateQuestion('modulo' as MathOperation, 1)).toThrow(
      QuestionGenerationError,
    )
  })
})

describe('generateQuestionForOperations', () => {
  it('picks among all selected operations', () => {
    const seen = new Set(
      Array.from(
        { length: 200 },
        () =>
          generateQuestionForOperations(['addition', 'division'], 2).operation,
      ),
    )
    expect(seen).toEqual(new Set(['addition', 'division']))
  })

  it('falls back to another operation when one fails', () => {
    const q = generateQuestionForOperations(
      ['modulo' as MathOperation, 'addition'],
      1,
      { random: () => 0 },
    )
    expect(q.operation).toBe('addition')
  })

  it('throws when nothing is selected', () => {
    expect(() => generateQuestionForOperations([], 1)).toThrow(
      QuestionGenerationError,
    )
  })
})
