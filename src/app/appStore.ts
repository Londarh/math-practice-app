import { DEFAULT_SETTINGS } from '../services/defaultSettings'
import {
  applyAttemptToPatterns,
  applyMasteryThreshold,
} from '../services/mistakeService'
import {
  addAttemptToStatistics,
  calculateStatistics,
  emptyStatistics,
} from '../services/statisticsService'
import {
  clearAllStoredData,
  getStorage,
  migrateStorage,
  readSection,
  writeSection,
} from '../services/storageService'
import type { MistakePattern } from '../types/mistake'
import { logDevError } from '../utils/devLog'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { AppSettings } from '../types/settings'
import type { AppStatistics } from '../types/statistics'
import {
  parseSettings,
  parseStatistics,
  parseStoredAttempts,
  parseStoredMistakePatterns,
  parseStoredSessions,
} from '../utils/validation'

/** Older records are dropped once these limits are reached. */
export const MAX_STORED_ATTEMPTS = 2000
export const MAX_STORED_SESSIONS = 100

/** Everything the app keeps in local storage, one field per storage section. */
export interface AppData {
  settings: AppSettings
  sessions: PracticeSession[]
  attempts: PracticeAttempt[]
  /**
   * Running totals. Kept separately from the attempts so the totals stay
   * right after the oldest attempts are dropped.
   */
  statistics: AppStatistics
  /** Facts the student got wrong, used for mistake review. */
  mistakePatterns: MistakePattern[]
}

export interface AppState extends AppData {
  /** Friendly message shown when saving or loading had a problem. */
  storageWarning: string | null
}

type DataSection = keyof AppData

const DATA_SECTIONS: DataSection[] = [
  'settings',
  'sessions',
  'attempts',
  'statistics',
  'mistakePatterns',
]

const SECTION_PARSERS: {
  [K in DataSection]: (raw: unknown) => AppData[K] | null
} = {
  settings: parseSettings,
  sessions: parseStoredSessions,
  attempts: parseStoredAttempts,
  statistics: parseStatistics,
  mistakePatterns: parseStoredMistakePatterns,
}

export const STORAGE_MESSAGES = {
  unavailable:
    "We can't save your progress on this device right now. You can keep practicing, but your results may not be kept.",
  full: 'Your device storage is full, so new results may not be saved. You can keep practicing.',
  invalid:
    'Some saved progress could not be read, so that part was reset. Everything else is still here.',
}

export function defaultAppData(): AppData {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      defaultOperations: [...DEFAULT_SETTINGS.defaultOperations],
    },
    sessions: [],
    attempts: [],
    statistics: emptyStatistics(),
    mistakePatterns: [],
  }
}

/**
 * Loads every section from storage. A missing or broken section falls back to
 * its default on its own, so one bad section never wipes the others.
 */
export function loadAppData(storage: Storage | null = getStorage()): {
  data: AppData
  warning: string | null
} {
  const data = defaultAppData()
  if (!storage || migrateStorage(storage) === 'unavailable') {
    return { data, warning: STORAGE_MESSAGES.unavailable }
  }
  let warning: string | null = null
  const load = <K extends DataSection>(section: K) => {
    const result = readSection(section, SECTION_PARSERS[section], storage)
    if (result.value !== null) data[section] = result.value
    if (result.status === 'invalid') {
      logDevError(`Stored ${section} were invalid and have been reset`)
      warning = STORAGE_MESSAGES.invalid
    }
    return result.status
  }
  const statuses = Object.fromEntries(
    DATA_SECTIONS.map((section) => [section, load(section)]),
  ) as Record<DataSection, ReturnType<typeof load>>

  // Missing or broken totals can be rebuilt from the attempts that are left.
  if (statuses.statistics !== 'ok' && data.attempts.length > 0) {
    data.statistics = calculateStatistics(data.attempts)
  }
  return { data, warning }
}

function keepNewest<T>(items: T[], limit: number): T[] {
  return items.length > limit ? items.slice(items.length - limit) : items
}

/**
 * Saves a session's progress: its record (added or updated) and any attempts
 * not stored yet. Safe to call repeatedly with the same data.
 */
export function recordSessionProgress(
  data: AppData,
  session: PracticeSession,
  sessionAttempts: readonly PracticeAttempt[],
): AppData {
  // A session nobody answered anything in is not worth keeping.
  if (session.attempted === 0) return data

  const known = new Set(data.attempts.map((attempt) => attempt.id))
  const newAttempts = sessionAttempts.filter(
    (attempt) => !known.has(attempt.id),
  )
  const index = data.sessions.findIndex((s) => s.id === session.id)
  const stored = index >= 0 ? data.sessions[index] : undefined
  const sessionChanged =
    !stored ||
    stored.attempted !== session.attempted ||
    stored.completedAt !== session.completedAt

  if (newAttempts.length === 0 && !sessionChanged) return data

  let sessions = data.sessions
  if (sessionChanged) {
    sessions =
      index >= 0
        ? data.sessions.map((s, i) => (i === index ? { ...session } : s))
        : keepNewest([...data.sessions, { ...session }], MAX_STORED_SESSIONS)
  }
  if (newAttempts.length === 0) return { ...data, sessions }

  return {
    ...data,
    sessions,
    attempts: keepNewest(
      [...data.attempts, ...newAttempts],
      MAX_STORED_ATTEMPTS,
    ),
    statistics: newAttempts.reduce(addAttemptToStatistics, data.statistics),
    mistakePatterns: newAttempts.reduce(
      (patterns, attempt) =>
        applyAttemptToPatterns(
          patterns,
          attempt,
          data.settings.masteryThreshold,
        ),
      data.mistakePatterns,
    ),
  }
}

/**
 * Erases practice history and totals. Settings are kept, and so are the saved
 * mistakes, so the student can still review them.
 */
export function resetStatistics(data: AppData): AppData {
  return {
    ...data,
    sessions: [],
    attempts: [],
    statistics: emptyStatistics(),
  }
}

/** Applies a settings change; invalid values are ignored field by field. */
export function updateSettings(
  data: AppData,
  changes: Partial<AppSettings>,
): AppData {
  const settings = parseSettings({ ...data.settings, ...changes })
  if (!settings) return data
  const same = (Object.keys(settings) as (keyof AppSettings)[]).every(
    (key) =>
      JSON.stringify(settings[key]) === JSON.stringify(data.settings[key]),
  )
  if (same) return data
  return {
    ...data,
    settings,
    mistakePatterns: applyMasteryThreshold(
      data.mistakePatterns,
      settings.masteryThreshold,
    ),
  }
}

export interface AppStore {
  getState: () => AppState
  subscribe: (listener: () => void) => () => void
  recordSessionProgress: (
    session: PracticeSession,
    attempts: readonly PracticeAttempt[],
  ) => void
  resetStatistics: () => void
  updateSettings: (changes: Partial<AppSettings>) => void
  /** Erases everything and goes back to the defaults of a first visit. */
  clearAllData: () => void
  dismissStorageWarning: () => void
}

/**
 * Holds the app's data in memory and writes each changed section to local
 * storage. If saving fails, practice keeps working and a warning is shown.
 */
export function createAppStore(
  storage: Storage | null = getStorage(),
): AppStore {
  const loaded = loadAppData(storage)
  let state: AppState = { ...loaded.data, storageWarning: loaded.warning }
  let dismissedWarning: string | null = null
  const listeners = new Set<() => void>()

  function setState(next: AppState) {
    state = next
    listeners.forEach((listener) => listener())
  }

  function commit(next: AppData) {
    if (DATA_SECTIONS.every((section) => next[section] === state[section])) {
      return
    }
    let warning = state.storageWarning
    for (const section of DATA_SECTIONS) {
      if (next[section] === state[section]) continue
      const status = writeSection(section, next[section], storage)
      if (status === 'ok') continue
      const message =
        status === 'full' ? STORAGE_MESSAGES.full : STORAGE_MESSAGES.unavailable
      // Do not keep re-showing a warning the student already closed.
      if (message !== dismissedWarning) warning = message
    }
    const data = Object.fromEntries(
      DATA_SECTIONS.map((section) => [section, next[section]]),
    ) as unknown as AppData
    setState({ ...data, storageWarning: warning })
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    recordSessionProgress(session, attempts) {
      commit(recordSessionProgress(state, session, attempts))
    },
    resetStatistics() {
      commit(resetStatistics(state))
    },
    updateSettings(changes) {
      commit(updateSettings(state, changes))
    },
    clearAllData() {
      clearAllStoredData(storage)
      migrateStorage(storage)
      commit(defaultAppData())
    },
    dismissStorageWarning() {
      dismissedWarning = state.storageWarning
      setState({ ...state, storageWarning: null })
    },
  }
}
