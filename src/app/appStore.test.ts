import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../services/defaultSettings'
import { STORAGE_KEYS } from '../services/storageService'
import { FakeStorage } from '../test/fakeStorage'
import { makeAttempt, makeSession } from '../test/fixtures'
import {
  createAppStore,
  defaultAppData,
  loadAppData,
  MAX_STORED_ATTEMPTS,
  MAX_STORED_SESSIONS,
  recordSessionProgress,
  STORAGE_MESSAGES,
} from './appStore'

describe('loadAppData', () => {
  it('uses defaults when nothing is stored', () => {
    const { data, warning } = loadAppData(new FakeStorage())

    expect(data).toEqual(defaultAppData())
    expect(data.settings).toEqual(DEFAULT_SETTINGS)
    expect(warning).toBeNull()
  })

  it('warns, but still works, when storage is unavailable', () => {
    const { data, warning } = loadAppData(null)

    expect(data).toEqual(defaultAppData())
    expect(warning).toBe(STORAGE_MESSAGES.unavailable)
  })

  it('resets only the broken section', () => {
    const attempt = makeAttempt()
    const storage = new FakeStorage({
      [STORAGE_KEYS.settings]: '][',
      [STORAGE_KEYS.attempts]: [attempt],
    })

    const { data, warning } = loadAppData(storage)

    expect(data.settings).toEqual(DEFAULT_SETTINGS)
    expect(data.attempts).toEqual([attempt])
    expect(warning).toBe(STORAGE_MESSAGES.invalid)
  })

  it('keeps valid settings fields when others are broken', () => {
    const storage = new FakeStorage({
      [STORAGE_KEYS.settings]: {
        defaultDifficulty: 3,
        defaultOperations: 'all',
        masteryThreshold: -2,
      },
    })

    const { settings } = loadAppData(storage).data

    expect(settings.defaultDifficulty).toBe(3)
    expect(settings.defaultOperations).toEqual(
      DEFAULT_SETTINGS.defaultOperations,
    )
    expect(settings.masteryThreshold).toBe(DEFAULT_SETTINGS.masteryThreshold)
  })

  it('drops single broken records and keeps the rest', () => {
    const good = makeAttempt()
    const storage = new FakeStorage({
      [STORAGE_KEYS.attempts]: [good, { id: 'x', operation: 'magic' }, null],
    })

    expect(loadAppData(storage).data.attempts).toEqual([good])
  })
})

describe('recordSessionProgress', () => {
  it('adds the session and its attempts', () => {
    const attempt = makeAttempt()
    const session = makeSession()

    const data = recordSessionProgress(defaultAppData(), session, [attempt])

    expect(data.sessions).toEqual([session])
    expect(data.attempts).toEqual([attempt])
  })

  it('updates the same session instead of adding it twice', () => {
    const first = makeAttempt()
    const second = makeAttempt({ selfReportedCorrect: false })
    let data = recordSessionProgress(defaultAppData(), makeSession(), [first])

    const finished = makeSession({
      attempted: 2,
      incorrect: 1,
      completedAt: '2026-10-21T10:05:00.000Z',
    })
    data = recordSessionProgress(data, finished, [first, second])

    expect(data.sessions).toEqual([finished])
    expect(data.attempts).toEqual([first, second])
  })

  it('returns the same data when nothing is new', () => {
    const data = recordSessionProgress(defaultAppData(), makeSession(), [
      makeAttempt(),
    ])
    const again = recordSessionProgress(
      data,
      { ...data.sessions[0] },
      data.attempts,
    )

    expect(again).toBe(data)
  })

  it('does not save a session with no answers', () => {
    const data = defaultAppData()
    const session = makeSession({ attempted: 0, correct: 0 })

    expect(recordSessionProgress(data, session, [])).toBe(data)
  })

  it('keeps only the newest records once the limits are reached', () => {
    const data = defaultAppData()
    data.attempts = Array.from({ length: MAX_STORED_ATTEMPTS }, () =>
      makeAttempt(),
    )
    data.sessions = Array.from({ length: MAX_STORED_SESSIONS }, (_, i) =>
      makeSession({ id: `old-${i}` }),
    )
    const newest = makeAttempt({ sessionId: 'new' })

    const next = recordSessionProgress(data, makeSession({ id: 'new' }), [
      newest,
    ])

    expect(next.attempts).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(next.attempts.at(-1)).toBe(newest)
    expect(next.attempts[0]).toBe(data.attempts[1])
    expect(next.sessions).toHaveLength(MAX_STORED_SESSIONS)
    expect(next.sessions.at(-1)?.id).toBe('new')
  })
})

describe('createAppStore', () => {
  it('keeps attempts and sessions after a browser restart', () => {
    const storage = new FakeStorage()
    const attempt = makeAttempt({
      selectedAnswer: 6,
      selfReportedCorrect: false,
      operation: 'multiplication',
      difficulty: 2,
      sessionId: 'session-9',
    })
    const session = makeSession({ id: 'session-9', incorrect: 1, correct: 0 })
    createAppStore(storage).recordSessionProgress(session, [attempt])

    // A new store reading the same storage is like reopening the browser.
    const reopened = createAppStore(storage).getState()

    expect(reopened.attempts).toEqual([attempt])
    expect(reopened.sessions).toEqual([session])
  })

  it('notifies subscribers when data changes', () => {
    const store = createAppStore(new FakeStorage())
    const listener = vi.fn()
    store.subscribe(listener)

    store.recordSessionProgress(makeSession(), [makeAttempt()])

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps working in memory and warns when storage is full', () => {
    const storage = new FakeStorage()
    const store = createAppStore(storage)
    storage.failWrites = 'quota'

    store.recordSessionProgress(makeSession(), [makeAttempt()])

    expect(store.getState().attempts).toHaveLength(1)
    expect(store.getState().storageWarning).toBe(STORAGE_MESSAGES.full)
  })

  it('does not show a dismissed warning again', () => {
    const storage = new FakeStorage()
    const store = createAppStore(storage)
    storage.failWrites = 'error'
    store.recordSessionProgress(makeSession(), [makeAttempt()])

    store.dismissStorageWarning()
    store.recordSessionProgress(makeSession({ attempted: 2, correct: 2 }), [
      makeAttempt(),
    ])

    expect(store.getState().storageWarning).toBeNull()
    expect(store.getState().attempts).toHaveLength(2)
  })
})
