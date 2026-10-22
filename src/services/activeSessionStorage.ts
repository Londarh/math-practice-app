import type { PracticeSessionState } from '../hooks/usePracticeSession'
import { logDevError } from '../utils/devLog'
import {
  isPracticeAttempt,
  isPracticeSession,
  isValidQuestion,
  parsePracticeConfig,
} from '../utils/validation'

/**
 * The session in progress lives in sessionStorage: it survives a page
 * refresh but belongs to one tab, so closing the tab never brings back a
 * stale half-finished session. Answers are saved permanently elsewhere.
 */
export const ACTIVE_SESSION_KEY = 'mathPractice.activeSession'

export interface SavedActiveSession {
  /** Router location key of the session page; a refresh keeps it. */
  locationKey: string
  state: PracticeSessionState
  selectedAnswer: number | null
  isCardFlipped: boolean
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** Validates saved data; anything unusable gives null, never an error. */
export function parseSavedActiveSession(
  value: unknown,
): SavedActiveSession | null {
  if (!isRecord(value) || typeof value.locationKey !== 'string') return null
  const { state, selectedAnswer, isCardFlipped } = value
  if (!isRecord(state)) return null

  const config = parsePracticeConfig(state.config)
  const { session, attempts, currentQuestion } = state
  if (
    !config ||
    !isPracticeSession(session) ||
    !Array.isArray(attempts) ||
    !attempts.every(isPracticeAttempt) ||
    attempts.length !== session.attempted ||
    state.isActive !== true ||
    !isValidQuestion(currentQuestion) ||
    !Number.isInteger(state.currentQuestionIndex) ||
    typeof isCardFlipped !== 'boolean'
  ) {
    return null
  }
  // The selected answer must be one of the choices; a flipped card needs one.
  const selected =
    typeof selectedAnswer === 'number' &&
    currentQuestion.choices.includes(selectedAnswer)
      ? selectedAnswer
      : null
  return {
    locationKey: value.locationKey,
    state: {
      config,
      session,
      currentQuestion,
      currentQuestionIndex: Number(state.currentQuestionIndex),
      attempts,
      isActive: true,
      error: null,
    },
    selectedAnswer: selected,
    isCardFlipped: selected !== null && isCardFlipped,
  }
}

export function saveActiveSession(saved: SavedActiveSession) {
  try {
    getSessionStorage()?.setItem(ACTIVE_SESSION_KEY, JSON.stringify(saved))
  } catch {
    // Recovery is a convenience; practice continues without it.
  }
}

/** The saved session for this page visit, or null (and broken data is removed). */
export function loadActiveSession(
  locationKey: string,
): SavedActiveSession | null {
  const storage = getSessionStorage()
  try {
    const text = storage?.getItem(ACTIVE_SESSION_KEY)
    if (!text) return null
    const saved = parseSavedActiveSession(JSON.parse(text))
    if (!saved) {
      logDevError('The saved session in progress was invalid and was removed')
      clearActiveSession()
      return null
    }
    return saved.locationKey === locationKey ? saved : null
  } catch {
    clearActiveSession()
    return null
  }
}

export function clearActiveSession() {
  try {
    getSessionStorage()?.removeItem(ACTIVE_SESSION_KEY)
  } catch {
    // Nothing else to do.
  }
}
