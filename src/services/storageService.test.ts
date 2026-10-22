import { describe, expect, it } from 'vitest'
import { FakeStorage } from '../test/fakeStorage'
import {
  clearAllStoredData,
  clearSections,
  getStorage,
  migrateStorage,
  readSchemaVersion,
  readSection,
  SCHEMA_VERSION,
  STORAGE_KEYS,
  writeSection,
} from './storageService'

const parseList = (value: unknown) => (Array.isArray(value) ? value : null)

describe('getStorage', () => {
  it('returns localStorage when it works', () => {
    expect(getStorage()).toBe(window.localStorage)
  })
})

describe('readSection', () => {
  it('reports missing data', () => {
    expect(readSection('sessions', parseList, new FakeStorage())).toEqual({
      value: null,
      status: 'missing',
    })
  })

  it('returns parsed, validated data', () => {
    const storage = new FakeStorage({ [STORAGE_KEYS.sessions]: [1, 2] })
    expect(readSection('sessions', parseList, storage)).toEqual({
      value: [1, 2],
      status: 'ok',
    })
  })

  it('removes only the section that holds broken JSON', () => {
    const storage = new FakeStorage({
      [STORAGE_KEYS.sessions]: '{not json',
      [STORAGE_KEYS.attempts]: [],
    })

    expect(readSection('sessions', parseList, storage).status).toBe('invalid')
    expect(storage.getItem(STORAGE_KEYS.sessions)).toBeNull()
    expect(storage.getItem(STORAGE_KEYS.attempts)).toBe('[]')
  })

  it('removes a section that fails validation', () => {
    const storage = new FakeStorage({ [STORAGE_KEYS.sessions]: { a: 1 } })

    expect(readSection('sessions', parseList, storage).status).toBe('invalid')
    expect(storage.getItem(STORAGE_KEYS.sessions)).toBeNull()
  })

  it('handles unavailable storage', () => {
    expect(readSection('sessions', parseList, null).status).toBe('unavailable')
  })
})

describe('writeSection', () => {
  it('writes JSON under the section key', () => {
    const storage = new FakeStorage()

    expect(writeSection('attempts', [{ id: 'a' }], storage)).toBe('ok')
    expect(storage.json(STORAGE_KEYS.attempts)).toEqual([{ id: 'a' }])
  })

  it('reports a full storage instead of throwing', () => {
    const storage = new FakeStorage()
    storage.failWrites = 'quota'

    expect(writeSection('attempts', [], storage)).toBe('full')
  })

  it('reports other write errors and missing storage', () => {
    const storage = new FakeStorage()
    storage.failWrites = 'error'

    expect(writeSection('attempts', [], storage)).toBe('error')
    expect(writeSection('attempts', [], null)).toBe('unavailable')
  })
})

describe('clearing data', () => {
  it('clears chosen sections only', () => {
    const storage = new FakeStorage({
      [STORAGE_KEYS.sessions]: [],
      [STORAGE_KEYS.settings]: {},
    })

    clearSections(['sessions'], storage)

    expect(storage.getItem(STORAGE_KEYS.sessions)).toBeNull()
    expect(storage.getItem(STORAGE_KEYS.settings)).toBe('{}')
  })

  it('clears every app key but leaves unrelated keys alone', () => {
    const storage = new FakeStorage({
      ...Object.fromEntries(Object.values(STORAGE_KEYS).map((k) => [k, 1])),
      'another.app': 'keep me',
    })

    clearAllStoredData(storage)

    expect(storage.length).toBe(1)
    expect(storage.getItem('another.app')).toBe('keep me')
  })
})

describe('migrateStorage', () => {
  it('stores the current version on a first visit', () => {
    const storage = new FakeStorage()

    expect(migrateStorage(storage)).toBe('current')
    expect(storage.json(STORAGE_KEYS.version)).toEqual({
      version: SCHEMA_VERSION,
    })
  })

  it('treats data without a version as an old version and upgrades it', () => {
    const storage = new FakeStorage({ [STORAGE_KEYS.sessions]: [] })

    expect(migrateStorage(storage)).toBe('migrated')
    expect(readSchemaVersion(storage)).toBe(SCHEMA_VERSION)
    expect(storage.getItem(STORAGE_KEYS.sessions)).toBe('[]')
  })

  it('upgrades an older stored version', () => {
    const storage = new FakeStorage({
      [STORAGE_KEYS.version]: { version: 0 },
      [STORAGE_KEYS.attempts]: [],
    })

    expect(migrateStorage(storage)).toBe('migrated')
    expect(readSchemaVersion(storage)).toBe(SCHEMA_VERSION)
  })

  it('does nothing when the version is current', () => {
    const storage = new FakeStorage({
      [STORAGE_KEYS.version]: { version: SCHEMA_VERSION },
    })

    expect(migrateStorage(storage)).toBe('current')
  })

  it('leaves data from a newer version untouched', () => {
    const storage = new FakeStorage({
      [STORAGE_KEYS.version]: { version: SCHEMA_VERSION + 1 },
      [STORAGE_KEYS.sessions]: ['future'],
    })

    expect(migrateStorage(storage)).toBe('newer')
    expect(readSchemaVersion(storage)).toBe(SCHEMA_VERSION + 1)
    expect(storage.json(STORAGE_KEYS.sessions)).toEqual(['future'])
  })

  it('repairs an unreadable version marker', () => {
    const storage = new FakeStorage({ [STORAGE_KEYS.version]: 'oops{' })

    migrateStorage(storage)

    expect(readSchemaVersion(storage)).toBe(SCHEMA_VERSION)
  })
})
