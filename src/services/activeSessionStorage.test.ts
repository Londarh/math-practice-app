import { describe, expect, it } from 'vitest'
import { createInitialState } from '../hooks/usePracticeSession'
import type { PracticeConfig } from '../types/session'
import {
  ACTIVE_SESSION_KEY,
  clearActiveSession,
  loadActiveSession,
  parseSavedActiveSession,
  saveActiveSession,
  type SavedActiveSession,
} from './activeSessionStorage'

const config: PracticeConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
}

function saved(overrides: Partial<SavedActiveSession> = {}) {
  const state = createInitialState(config)
  return {
    locationKey: 'key-1',
    state,
    selectedAnswer: state.currentQuestion!.choices[0],
    isCardFlipped: true,
    ...overrides,
  }
}

/** A JSON round trip, like a real save and load. */
const roundTrip = (value: unknown) => JSON.parse(JSON.stringify(value))

describe('parseSavedActiveSession', () => {
  it('accepts a valid saved session', () => {
    const value = saved()

    expect(parseSavedActiveSession(roundTrip(value))).toEqual(value)
  })

  it.each([
    ['not an object', 'nope'],
    ['no location key', { ...saved(), locationKey: 3 }],
    [
      'a finished session',
      saved({ state: { ...saved().state, isActive: false } }),
    ],
    [
      'attempts that do not match the totals',
      saved({
        state: {
          ...saved().state,
          session: { ...saved().state.session, attempted: 2, correct: 2 },
        },
      }),
    ],
    [
      'a question with a wrong answer',
      saved({
        state: {
          ...saved().state,
          currentQuestion: {
            ...saved().state.currentQuestion!,
            correctAnswer: -1,
          },
        },
      }),
    ],
    [
      'a broken config',
      saved({ state: { ...saved().state, config: {} as PracticeConfig } }),
    ],
  ])('rejects %s', (_label, value) => {
    expect(parseSavedActiveSession(roundTrip(value))).toBeNull()
  })

  it('drops a selected answer that is not one of the choices', () => {
    const parsed = parseSavedActiveSession(
      roundTrip(saved({ selectedAnswer: 999 })),
    )

    expect(parsed?.selectedAnswer).toBeNull()
    // A card cannot be flipped without an answer.
    expect(parsed?.isCardFlipped).toBe(false)
  })
})

describe('saving and loading', () => {
  it('loads the session saved for the same page visit only', () => {
    saveActiveSession(saved())

    expect(loadActiveSession('key-1')?.locationKey).toBe('key-1')
    expect(loadActiveSession('another-visit')).toBeNull()
  })

  it('removes broken data instead of failing', () => {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, '{oops')

    expect(loadActiveSession('key-1')).toBeNull()
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull()
  })

  it('can be cleared', () => {
    saveActiveSession(saved())
    clearActiveSession()

    expect(loadActiveSession('key-1')).toBeNull()
  })
})
