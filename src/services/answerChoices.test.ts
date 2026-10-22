import { describe, expect, it } from 'vitest'
import type { DifficultyLevel, MathOperation } from '../types/question'
import {
  CHOICE_COUNT,
  buildChoices,
  differenceWithoutBorrow,
  generateDistractors,
  isPlausible,
  operationDistractors,
  sumWithoutCarry,
} from './answerChoices'
import { createQuestion, generateQuestion } from './questionGenerator'

const levels: DifficultyLevel[] = [1, 2, 3, 4]
const operations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const combos = operations.flatMap((op) =>
  levels.map((level) => [op, level] as const),
)

describe('answer choices on generated questions', () => {
  it.each(combos)(
    '%s level %i: 4 unique whole-number choices with the answer once',
    (operation, level) => {
      for (let i = 0; i < 300; i++) {
        const q = generateQuestion(operation, level)
        expect(q.choices).toHaveLength(CHOICE_COUNT)
        expect(new Set(q.choices).size).toBe(CHOICE_COUNT)
        expect(q.choices.filter((c) => c === q.correctAnswer)).toHaveLength(1)
        for (const choice of q.choices) {
          expect(Number.isInteger(choice)).toBe(true)
          expect(choice).toBeGreaterThanOrEqual(0)
          expect(isPlausible(choice, q.correctAnswer)).toBe(true)
        }
      }
    },
  )

  it('may use negative choices only for level-4 subtraction when enabled', () => {
    let sawNegative = false
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion('subtraction', 4, {
        allowNegativeSubtraction: true,
      })
      if (q.choices.some((c) => c < 0)) sawNegative = true
      expect(new Set(q.choices).size).toBe(CHOICE_COUNT)
    }
    expect(sawNegative).toBe(true)
  })
})

describe('answers near zero', () => {
  it.each([
    ['addition', 0, 0],
    ['subtraction', 0, 0],
    ['subtraction', 1, 0],
    ['multiplication', 0, 0],
    ['multiplication', 0, 5],
    ['multiplication', 1, 1],
    ['division', 0, 1],
    ['division', 0, 5],
    ['division', 1, 1],
  ] as const)(
    '%s %i and %i gets 4 unique non-negative choices',
    (operation, a, b) => {
      for (let i = 0; i < 100; i++) {
        const q = createQuestion({
          operation,
          firstOperand: a,
          secondOperand: b,
          difficulty: 1,
        })
        expect(new Set(q.choices).size).toBe(CHOICE_COUNT)
        expect(q.choices).toContain(q.correctAnswer)
        expect(Math.min(...q.choices)).toBeGreaterThanOrEqual(0)
      }
    },
  )
})

describe('operation-specific distractors', () => {
  it('uses nearby times-table facts for multiplication (8 × 7)', () => {
    expect(operationDistractors('multiplication', 8, 7, 56)).toEqual(
      expect.arrayContaining([48, 64, 49, 63]),
    )
  })

  it('uses the same fact family for division (56 ÷ 7)', () => {
    expect(operationDistractors('division', 56, 7, 8)).toEqual(
      expect.arrayContaining([7, 9]),
    )
  })

  it('includes a forgot-to-carry mistake for addition', () => {
    expect(sumWithoutCarry(27, 15)).toBe(32)
    expect(sumWithoutCarry(999, 1)).toBe(990)
    expect(operationDistractors('addition', 27, 15, 42)).toContain(32)
  })

  it('includes a forgot-to-borrow mistake for subtraction', () => {
    expect(differenceWithoutBorrow(52, 17)).toBe(45)
    expect(operationDistractors('subtraction', 52, 17, 35)).toContain(45)
  })
})

describe('generateDistractors', () => {
  it('always returns exactly three values that differ from the answer', () => {
    for (const answer of [0, 1, 2, 7, 56, 999, 5000]) {
      const distractors = generateDistractors('addition', answer, 0, answer)
      expect(distractors).toHaveLength(3)
      expect(distractors).not.toContain(answer)
      expect(new Set(distractors).size).toBe(3)
    }
  })

  it('finishes even with a random source that always repeats itself', () => {
    const stuck = () => 0
    const distractors = generateDistractors('multiplication', 0, 0, 0, {
      random: stuck,
    })
    expect(distractors).toHaveLength(3)
    expect(Math.min(...distractors)).toBeGreaterThan(0)
  })
})

describe('buildChoices shuffling', () => {
  it('puts the correct answer in every position, not a predictable one', () => {
    const positions = [0, 0, 0, 0]
    const runs = 2000
    for (let i = 0; i < runs; i++) {
      positions[buildChoices('multiplication', 8, 7, 56).indexOf(56)]++
    }
    for (const count of positions) {
      // Each spot should get roughly a quarter of the runs.
      expect(count).toBeGreaterThan(runs * 0.15)
      expect(count).toBeLessThan(runs * 0.35)
    }
  })
})
