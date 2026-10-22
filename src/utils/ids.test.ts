import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './ids'

describe('createId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts with the given prefix', () => {
    expect(createId('question')).toMatch(/^question-/)
  })

  it('creates unique IDs', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId('x')))
    expect(ids.size).toBe(1000)
  })

  it('still creates unique IDs when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {})
    const ids = new Set(Array.from({ length: 1000 }, () => createId('x')))
    expect(ids.size).toBe(1000)
  })
})
