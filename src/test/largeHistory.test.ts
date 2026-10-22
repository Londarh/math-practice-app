import { describe, expect, it } from 'vitest'
import {
  createAppStore,
  loadAppData,
  MAX_STORED_ATTEMPTS,
  MAX_STORED_SESSIONS,
} from '../app/appStore'
import { STORAGE_KEYS } from '../services/storageService'
import type { MathOperation } from '../types/question'
import type { PracticeAttempt } from '../types/session'
import { ALL_OPERATIONS } from '../utils/labels'
import { FakeStorage } from './fakeStorage'
import { makeAttempt, makeSession } from './fixtures'

const TOTAL_ATTEMPTS = 5000
const PER_SESSION = 25

/** Total characters this app keeps in storage (what browser quotas count). */
function storedCharacters(storage: Storage) {
  return Object.values(STORAGE_KEYS).reduce(
    (sum, key) => sum + key.length + (storage.getItem(key)?.length ?? 0),
    0,
  )
}

describe('several thousand attempts', () => {
  it('keeps totals exact, storage compact and loading fast', () => {
    const storage = new FakeStorage()
    const store = createAppStore(storage)
    let correct = 0

    for (let s = 0; s < TOTAL_ATTEMPTS / PER_SESSION; s++) {
      const sessionId = `session-${s}`
      const attempts: PracticeAttempt[] = []
      for (let i = 0; i < PER_SESSION; i++) {
        const isCorrect = (s + i) % 3 !== 0
        if (isCorrect) correct += 1
        attempts.push(
          makeAttempt({
            sessionId,
            operation: ALL_OPERATIONS[i % 4] as MathOperation,
            firstOperand: 8,
            secondOperand: 4,
            correctAnswer: [12, 4, 32, 2][i % 4],
            selectedAnswer: [12, 4, 32, 2][i % 4],
            selfReportedCorrect: isCorrect,
            attemptedAt: new Date(Date.UTC(2026, 0, 1, 0, s)).toISOString(),
          }),
        )
      }
      store.recordSessionProgress(
        makeSession({
          id: sessionId,
          startedAt: attempts[0].attemptedAt,
          completedAt: attempts[0].attemptedAt,
          sessionLength: PER_SESSION,
          attempted: PER_SESSION,
          correct: attempts.filter((a) => a.selfReportedCorrect).length,
          incorrect: attempts.filter((a) => !a.selfReportedCorrect).length,
        }),
        attempts,
      )
    }

    const state = store.getState()
    // Totals cover every attempt, even the detailed records that were dropped.
    expect(state.statistics.attempted).toBe(TOTAL_ATTEMPTS)
    expect(state.statistics.correct).toBe(correct)
    expect(
      Object.values(state.statistics.byOperation).reduce(
        (sum, c) => sum + c.attempted,
        0,
      ),
    ).toBe(TOTAL_ATTEMPTS)
    // Only the newest details are kept.
    expect(state.attempts).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(state.sessions).toHaveLength(MAX_STORED_SESSIONS)
    expect(state.sessions.at(-1)?.id).toBe(
      `session-${TOTAL_ATTEMPTS / PER_SESSION - 1}`,
    )
    // Well under the ~5 million characters browsers allow per site.
    const characters = storedCharacters(storage)
    expect(characters).toBeLessThan(1_000_000)
    console.info(
      `Storage after ${TOTAL_ATTEMPTS} attempts: ${(characters / 1000).toFixed(0)}k characters`,
    )

    // Opening the app again reads and validates everything quickly.
    const started = performance.now()
    const reloaded = loadAppData(storage).data
    const elapsed = performance.now() - started
    expect(reloaded.statistics.attempted).toBe(TOTAL_ATTEMPTS)
    expect(reloaded.attempts).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(elapsed).toBeLessThan(500)
    console.info(
      `Loading ${MAX_STORED_ATTEMPTS} stored attempts took ${elapsed.toFixed(0)} ms`,
    )
  })
})
