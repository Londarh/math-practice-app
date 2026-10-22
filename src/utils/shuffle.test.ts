import { describe, expect, it } from 'vitest'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('keeps exactly the same items', () => {
    const items = [1, 2, 3, 4, 5]
    expect([...shuffle(items)].sort()).toEqual(items)
  })

  it('does not change the original list', () => {
    const items = [1, 2, 3, 4]
    shuffle(items)
    expect(items).toEqual([1, 2, 3, 4])
  })

  it('can produce every ordering of a small list', () => {
    const orders = new Set<string>()
    for (let i = 0; i < 1000; i++) orders.add(shuffle(['a', 'b', 'c']).join(''))
    expect(orders.size).toBe(6)
  })

  it('handles empty and single-item lists', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle([9])).toEqual([9])
  })
})
