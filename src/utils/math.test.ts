import { describe, expect, it } from 'vitest'
import { computeAnswer, randomInt, randomItem } from './math'

describe('randomInt', () => {
  it('returns the minimum and maximum at the edges of the random range', () => {
    expect(randomInt(3, 7, () => 0)).toBe(3)
    expect(randomInt(3, 7, () => 0.999999)).toBe(7)
  })

  it('only returns whole numbers inside the range and reaches every value', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const value = randomInt(-2, 4)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(-2)
      expect(value).toBeLessThanOrEqual(4)
      seen.add(value)
    }
    expect(seen.size).toBe(7)
  })

  it('works when min equals max', () => {
    expect(randomInt(5, 5)).toBe(5)
  })

  it('rejects empty or fractional ranges', () => {
    expect(() => randomInt(5, 4)).toThrow(RangeError)
    expect(() => randomInt(0.5, 4)).toThrow(RangeError)
  })
})

describe('randomItem', () => {
  it('picks an item from the list', () => {
    expect(randomItem(['a', 'b', 'c'], () => 0.5)).toBe('b')
  })

  it('rejects an empty list', () => {
    expect(() => randomItem([])).toThrow(RangeError)
  })
})

describe('computeAnswer', () => {
  it('computes each operation', () => {
    expect(computeAnswer('addition', 7, 8)).toBe(15)
    expect(computeAnswer('subtraction', 7, 8)).toBe(-1)
    expect(computeAnswer('multiplication', 7, 8)).toBe(56)
    expect(computeAnswer('division', 56, 7)).toBe(8)
  })

  it('returns NaN instead of dividing by zero', () => {
    expect(computeAnswer('division', 5, 0)).toBeNaN()
  })
})
