import { describe, expect, it } from 'vitest'
import { makePattern } from '../test/fixtures'
import type { Question } from '../types/question'
import { parsePracticeConfig, validateQuestion } from './validation'

describe('parsePracticeConfig', () => {
  it('accepts a valid config and orders operations consistently', () => {
    expect(
      parsePracticeConfig({
        operations: ['division', 'addition'],
        difficulty: 2,
        sessionLength: 5,
      }),
    ).toEqual({
      operations: ['addition', 'division'],
      difficulty: 2,
      sessionLength: 5,
    })
  })

  it('accepts continuous sessions and review patterns', () => {
    const config = parsePracticeConfig({
      operations: ['multiplication'],
      difficulty: 1,
      sessionLength: 'continuous',
      reviewPatterns: [makePattern()],
    })

    expect(config?.sessionLength).toBe('continuous')
    expect(config?.reviewPatterns).toHaveLength(1)
  })

  it.each([
    ['missing data', undefined],
    ['not an object', 'addition'],
    ['no operations', { operations: [], difficulty: 1, sessionLength: 5 }],
    [
      'unknown operation',
      { operations: ['modulo'], difficulty: 1, sessionLength: 5 },
    ],
    [
      'bad difficulty',
      { operations: ['addition'], difficulty: 7, sessionLength: 5 },
    ],
    [
      'bad session length',
      { operations: ['addition'], difficulty: 1, sessionLength: 0 },
    ],
    [
      'bad review patterns',
      {
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
        reviewPatterns: [{ operation: 'addition', firstOperand: 'x' }],
      },
    ],
    [
      'empty review patterns',
      {
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
        reviewPatterns: [],
      },
    ],
  ])('rejects %s', (_label, value) => {
    expect(parsePracticeConfig(value)).toBeNull()
  })
})

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'question-test',
    operation: 'multiplication',
    firstOperand: 7,
    secondOperand: 8,
    displayText: '7 × 8 = ?',
    correctAnswer: 56,
    choices: [48, 54, 56, 64],
    difficulty: 2,
    source: 'regular',
    ...overrides,
  }
}

describe('validateQuestion', () => {
  it('accepts a correct question', () => {
    expect(validateQuestion(makeQuestion({}))).toEqual([])
  })

  it('rejects unsupported operations', () => {
    expect(
      validateQuestion(
        makeQuestion({ operation: 'modulo' as Question['operation'] }),
      ),
    ).toHaveLength(1)
  })

  it('rejects division by zero', () => {
    const errors = validateQuestion(
      makeQuestion({
        operation: 'division',
        firstOperand: 8,
        secondOperand: 0,
        correctAnswer: NaN,
      }),
    )
    expect(errors).toContain('Division by zero')
  })

  it('rejects division with a fractional answer', () => {
    const errors = validateQuestion(
      makeQuestion({
        operation: 'division',
        firstOperand: 7,
        secondOperand: 2,
        correctAnswer: 3.5,
      }),
    )
    expect(errors.join()).toMatch(/whole number/)
  })

  it('rejects a wrong answer', () => {
    expect(
      validateQuestion(makeQuestion({ correctAnswer: 54 })).join(),
    ).toMatch(/is wrong/)
  })

  it('rejects numbers outside the level', () => {
    const errors = validateQuestion(
      makeQuestion({
        firstOperand: 12,
        correctAnswer: 96,
        choices: [96, 88, 84, 104],
        difficulty: 2,
      }),
    )
    expect(errors.join()).toMatch(/does not match level 2/)
  })

  it('rejects negative subtraction unless allowed at level 4', () => {
    const negative = makeQuestion({
      operation: 'subtraction',
      firstOperand: 20,
      secondOperand: 50,
      correctAnswer: -30,
      choices: [-30, -20, -31, -29],
      difficulty: 4,
    })
    expect(validateQuestion(negative)).not.toEqual([])
    expect(
      validateQuestion(negative, { allowNegativeSubtraction: true }),
    ).toEqual([])
    expect(
      validateQuestion(
        { ...negative, difficulty: 3 },
        { allowNegativeSubtraction: true },
      ),
    ).not.toEqual([])
  })

  it.each([
    ['too few choices', [56, 48, 64]],
    ['too many choices', [56, 48, 64, 54, 63]],
    ['duplicate choices', [56, 48, 48, 64]],
    ['missing correct answer', [48, 54, 63, 64]],
    ['fractional choices', [56, 48, 54.5, 64]],
    ['negative choices', [56, -1, 54, 64]],
  ])('rejects %s', (_label, choices) => {
    expect(validateQuestion(makeQuestion({ choices }))).not.toEqual([])
  })
})
