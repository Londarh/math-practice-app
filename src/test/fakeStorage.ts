/** An in-memory Storage, optionally failing writes like a full or blocked one. */
export class FakeStorage implements Storage {
  private items = new Map<string, string>()
  failWrites: 'none' | 'quota' | 'error' = 'none'

  constructor(initial: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.items.set(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      )
    }
  }

  get length() {
    return this.items.size
  }

  key(index: number) {
    return [...this.items.keys()][index] ?? null
  }

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.failWrites === 'quota') {
      throw new DOMException('Storage is full', 'QuotaExceededError')
    }
    if (this.failWrites === 'error') throw new Error('Storage is blocked')
    this.items.set(key, String(value))
  }

  removeItem(key: string) {
    this.items.delete(key)
  }

  clear() {
    this.items.clear()
  }

  /** The parsed JSON stored under a key, for assertions. */
  json(key: string): unknown {
    const text = this.items.get(key)
    return text === undefined ? undefined : JSON.parse(text)
  }
}
