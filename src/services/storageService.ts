/** Local-storage keys from specification section 11. */
export const STORAGE_KEYS = {
  settings: 'mathPractice.settings',
  sessions: 'mathPractice.sessions',
  attempts: 'mathPractice.attempts',
  mistakePatterns: 'mathPractice.mistakePatterns',
  statistics: 'mathPractice.statistics',
  version: 'mathPractice.version',
} as const

export type StorageSection = Exclude<keyof typeof STORAGE_KEYS, 'version'>

export const STORAGE_SECTIONS = Object.keys(STORAGE_KEYS).filter(
  (key) => key !== 'version',
) as StorageSection[]

/** The shape of the stored data. Bump this and add a migration when it changes. */
export const SCHEMA_VERSION = 1

/**
 * Upgrades stored data one version at a time: `MIGRATIONS[n]` turns version
 * n - 1 into version n. Version 0 means data saved before versioning existed.
 */
export const MIGRATIONS: Record<number, (storage: Storage) => void> = {
  // Version 1 is the first versioned shape; unversioned data already matches it.
  1: () => {},
}

export type ReadStatus = 'ok' | 'missing' | 'invalid' | 'unavailable'
export type WriteStatus = 'ok' | 'unavailable' | 'full' | 'error'

export interface ReadResult<T> {
  value: T | null
  status: ReadStatus
}

const PROBE_KEY = 'mathPractice.__probe__'

/**
 * Returns localStorage if it can actually be written to, or null when it is
 * missing, blocked (e.g. some private-browsing modes) or throws.
 */
export function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    window.localStorage.setItem(PROBE_KEY, '1')
    window.localStorage.removeItem(PROBE_KEY)
    return window.localStorage
  } catch {
    return null
  }
}

export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  )
}

/**
 * Reads and validates one section. Data that cannot be parsed or fails
 * validation is removed, so only that section falls back to its defaults.
 */
export function readSection<T>(
  section: StorageSection,
  parse: (raw: unknown) => T | null,
  storage: Storage | null = getStorage(),
): ReadResult<T> {
  if (!storage) return { value: null, status: 'unavailable' }
  const key = STORAGE_KEYS[section]
  let text: string | null
  try {
    text = storage.getItem(key)
  } catch {
    return { value: null, status: 'unavailable' }
  }
  if (text === null) return { value: null, status: 'missing' }

  let value: T | null
  try {
    value = parse(JSON.parse(text))
  } catch {
    value = null
  }
  if (value === null) {
    removeKey(storage, key)
    return { value: null, status: 'invalid' }
  }
  return { value, status: 'ok' }
}

export function writeSection(
  section: StorageSection,
  value: unknown,
  storage: Storage | null = getStorage(),
): WriteStatus {
  if (!storage) return 'unavailable'
  try {
    storage.setItem(STORAGE_KEYS[section], JSON.stringify(value))
    return 'ok'
  } catch (error) {
    return isQuotaError(error) ? 'full' : 'error'
  }
}

function removeKey(storage: Storage, key: string) {
  try {
    storage.removeItem(key)
  } catch {
    // Nothing more we can do; the bad value is ignored on every read anyway.
  }
}

export function clearSections(
  sections: readonly StorageSection[],
  storage: Storage | null = getStorage(),
) {
  if (!storage) return
  for (const section of sections) removeKey(storage, STORAGE_KEYS[section])
}

/** Removes every key this app owns. Other sites' or apps' keys are left alone. */
export function clearAllStoredData(storage: Storage | null = getStorage()) {
  if (!storage) return
  clearSections(STORAGE_SECTIONS, storage)
  removeKey(storage, STORAGE_KEYS.version)
}

/** Reads the stored schema version; null when none (or an unreadable one) is stored. */
export function readSchemaVersion(storage: Storage): number | null {
  try {
    const text = storage.getItem(STORAGE_KEYS.version)
    if (text === null) return null
    const parsed: unknown = JSON.parse(text)
    const version =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as { version?: unknown }).version
        : undefined
    return Number.isInteger(version) && Number(version) >= 0
      ? Number(version)
      : null
  } catch {
    return null
  }
}

export type MigrationOutcome = 'current' | 'migrated' | 'newer' | 'unavailable'

/**
 * Brings stored data up to SCHEMA_VERSION. Data from a newer app version is
 * left untouched so that opening an old tab never deletes newer progress.
 */
export function migrateStorage(
  storage: Storage | null = getStorage(),
): MigrationOutcome {
  if (!storage) return 'unavailable'
  const stored = readSchemaVersion(storage)
  let hasData: boolean
  try {
    hasData = STORAGE_SECTIONS.some(
      (section) => storage.getItem(STORAGE_KEYS[section]) !== null,
    )
  } catch {
    return 'unavailable'
  }

  if (stored !== null && stored > SCHEMA_VERSION) return 'newer'
  if (stored === SCHEMA_VERSION) return 'current'

  // No version and no data: a first visit, nothing to migrate.
  const from = stored ?? (hasData ? 0 : SCHEMA_VERSION)
  for (let version = from + 1; version <= SCHEMA_VERSION; version++) {
    try {
      MIGRATIONS[version]?.(storage)
    } catch {
      // A failed migration leaves the data as it was; section validation
      // on load then resets only the parts that no longer fit.
    }
  }
  try {
    storage.setItem(
      STORAGE_KEYS.version,
      JSON.stringify({ version: SCHEMA_VERSION }),
    )
  } catch {
    return 'unavailable'
  }
  return from === SCHEMA_VERSION ? 'current' : 'migrated'
}
