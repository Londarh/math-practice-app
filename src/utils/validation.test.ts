import { describe, expect, it } from 'vitest'
import { parsePracticeConfig } from './validation'

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

  it('accepts continuous sessions and review items', () => {
    const config = parsePracticeConfig({
      operations: ['multiplication'],
      difficulty: 1,
      sessionLength: 'continuous',
      reviewItems: [
        { operation: 'multiplication', firstOperand: 3, secondOperand: 4 },
      ],
    })

    expect(config?.sessionLength).toBe('continuous')
    expect(config?.reviewItems).toHaveLength(1)
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
      'bad review items',
      {
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
        reviewItems: [{ operation: 'addition', firstOperand: 'x' }],
      },
    ],
  ])('rejects %s', (_label, value) => {
    expect(parsePracticeConfig(value)).toBeNull()
  })
})
