import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../services/defaultSettings'
import { calculateStatistics } from '../services/statisticsService'
import { STORAGE_KEYS } from '../services/storageService'
import { FakeStorage } from '../test/fakeStorage'
import { makeAttempt, makePattern, makeSession } from '../test/fixtures'
import {
  createAppStore,
  defaultAppData,
  loadAppData,
  MAX_STORED_ATTEMPTS,
  MAX_STORED_SESSIONS,
  recordSessionProgress,
  resetStatistics,
  STORAGE_MESSAGES,
  updateSettings,
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

describe('statistics in the store', () => {
  it('adds each new attempt to the running totals once', () => {
    const wrong = makeAttempt({ selfReportedCorrect: false })
    let data = recordSessionProgress(defaultAppData(), makeSession(), [wrong])
    data = recordSessionProgress(
      data,
      makeSession({ attempted: 2, correct: 1, incorrect: 1 }),
      [wrong, makeAttempt()],
    )

    expect(data.statistics.attempted).toBe(2)
    expect(data.statistics.correct).toBe(1)
    expect(data.statistics.byOperation.addition.incorrect).toBe(1)
  })

  it('keeps totals correct after old attempts are dropped', () => {
    const data = defaultAppData()
    data.attempts = Array.from({ length: MAX_STORED_ATTEMPTS }, () =>
      makeAttempt(),
    )
    data.statistics = calculateStatistics(data.attempts)

    const next = recordSessionProgress(data, makeSession({ id: 'new' }), [
      makeAttempt(),
    ])

    expect(next.attempts).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(next.statistics.attempted).toBe(MAX_STORED_ATTEMPTS + 1)
  })

  it('rebuilds missing or corrupted totals from the stored attempts', () => {
    const attempts = [
      makeAttempt(),
      makeAttempt({ selfReportedCorrect: false }),
    ]
    const missing = new FakeStorage({ [STORAGE_KEYS.attempts]: attempts })
    const corrupted = new FakeStorage({
      [STORAGE_KEYS.attempts]: attempts,
      [STORAGE_KEYS.statistics]: { attempted: 5, correct: 1, incorrect: 1 },
    })

    expect(loadAppData(missing).data.statistics).toEqual(
      calculateStatistics(attempts),
    )
    expect(loadAppData(corrupted).data.statistics).toEqual(
      calculateStatistics(attempts),
    )
  })

  it('reset erases history and totals but keeps settings', () => {
    let data = recordSessionProgress(defaultAppData(), makeSession(), [
      makeAttempt(),
    ])
    data = { ...data, settings: { ...data.settings, defaultDifficulty: 3 } }

    const reset = resetStatistics(data)

    expect(reset.attempts).toEqual([])
    expect(reset.sessions).toEqual([])
    expect(reset.statistics.attempted).toBe(0)
    expect(reset.settings.defaultDifficulty).toBe(3)
  })
})

describe('settings in the store', () => {
  it('applies valid changes and ignores invalid ones', () => {
    const data = defaultAppData()

    const next = updateSettings(data, {
      defaultDifficulty: 2,
      masteryThreshold: 0,
    })

    expect(next.settings.defaultDifficulty).toBe(2)
    expect(next.settings.masteryThreshold).toBe(
      DEFAULT_SETTINGS.masteryThreshold,
    )
  })

  it('returns the same data when nothing changes', () => {
    const data = defaultAppData()

    expect(updateSettings(data, { defaultDifficulty: 1 })).toBe(data)
  })

  it('persists settings so they load on the next start', () => {
    const storage = new FakeStorage()
    createAppStore(storage).updateSettings({ cardAnimationEnabled: false })

    expect(
      createAppStore(storage).getState().settings.cardAnimationEnabled,
    ).toBe(false)
  })

  it('clear all data restores every default', () => {
    const storage = new FakeStorage({ 'other.key': 'x' })
    const store = createAppStore(storage)
    store.updateSettings({ defaultDifficulty: 4 })
    store.recordSessionProgress(makeSession(), [makeAttempt()])

    store.clearAllData()

    const { storageWarning, ...data } = store.getState()
    expect(data).toEqual(defaultAppData())
    expect(storageWarning).toBeNull()
    expect(createAppStore(storage).getState().settings).toEqual(
      DEFAULT_SETTINGS,
    )
    expect(storage.json(STORAGE_KEYS.version)).toEqual({ version: 1 })
    expect(storage.getItem('other.key')).toBe('x')
  })
})

describe('mistake patterns in the store', () => {
  const wrong = () =>
    makeAttempt({
      operation: 'multiplication',
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
      selfReportedCorrect: false,
    })

  it('creates patterns from incorrect answers and saves them', () => {
    const storage = new FakeStorage()
    createAppStore(storage).recordSessionProgress(
      makeSession({ attempted: 2, correct: 1, incorrect: 1 }),
      [wrong(), makeAttempt()],
    )

    const patterns = createAppStore(storage).getState().mistakePatterns
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      operation: 'multiplication',
      firstOperand: 8,
      secondOperand: 7,
      incorrectCount: 1,
    })
  })

  it('drops invalid stored pattern records and keeps the good ones', () => {
    const data = recordSessionProgress(defaultAppData(), makeSession(), [
      wrong(),
    ])
    const storage = new FakeStorage({
      [STORAGE_KEYS.mistakePatterns]: [
        data.mistakePatterns[0],
        { ...data.mistakePatterns[0], id: 'bad', correctAnswer: 55 },
        {
          ...data.mistakePatterns[0],
          id: 'zero',
          operation: 'division',
          secondOperand: 0,
        },
        'nonsense',
      ],
    })

    expect(loadAppData(storage).data.mistakePatterns).toEqual(
      data.mistakePatterns,
    )
  })

  it('resets a pattern section that is not a list', () => {
    const storage = new FakeStorage({
      [STORAGE_KEYS.mistakePatterns]: { oops: true },
      [STORAGE_KEYS.settings]: { defaultDifficulty: 2 },
    })

    const { data, warning } = loadAppData(storage)

    expect(data.mistakePatterns).toEqual([])
    expect(data.settings.defaultDifficulty).toBe(2)
    expect(warning).toBe(STORAGE_MESSAGES.invalid)
  })

  it('keeps patterns when statistics are reset', () => {
    const data = recordSessionProgress(defaultAppData(), makeSession(), [
      wrong(),
    ])

    expect(resetStatistics(data).mistakePatterns).toEqual(data.mistakePatterns)
  })
})

describe('mistake review in the store', () => {
  it('review answers update the original pattern until it is mastered', () => {
    const store = createAppStore(new FakeStorage())
    store.updateSettings({ masteryThreshold: 2 })
    store.recordSessionProgress(
      makeSession({ id: 's1', correct: 0, incorrect: 1 }),
      [makeAttempt({ sessionId: 's1', selfReportedCorrect: false })],
    )
    const [pattern] = store.getState().mistakePatterns
    const reviewAttempt = () =>
      makeAttempt({
        sessionId: 's2',
        source: 'mistake-review',
        mistakePatternId: pattern.id,
        firstOperand: 3,
        secondOperand: 3,
        correctAnswer: 6,
      })
    const first = reviewAttempt()
    const second = reviewAttempt()

    store.recordSessionProgress(makeSession({ id: 's2' }), [first])
    expect(store.getState().mistakePatterns[0].mastered).toBe(false)
    store.recordSessionProgress(
      makeSession({ id: 's2', attempted: 2, correct: 2 }),
      [first, second],
    )

    const [updated] = store.getState().mistakePatterns
    expect(updated).toMatchObject({ similarCorrectCount: 2, mastered: true })
    expect(store.getState().mistakePatterns).toHaveLength(1)
    expect(store.getState().statistics.reviewCorrect).toBe(2)
  })

  it('changing the mastery threshold re-checks saved patterns', () => {
    const storage = new FakeStorage({
      [STORAGE_KEYS.mistakePatterns]: [
        makePattern({ similarCorrectCount: 2, mastered: false }),
      ],
    })
    const store = createAppStore(storage)

    store.updateSettings({ masteryThreshold: 2 })
    expect(store.getState().mistakePatterns[0].mastered).toBe(true)

    store.updateSettings({ masteryThreshold: 4 })
    expect(store.getState().mistakePatterns[0].mastered).toBe(false)
    expect(createAppStore(storage).getState().mistakePatterns[0].mastered).toBe(
      false,
    )
  })
})
