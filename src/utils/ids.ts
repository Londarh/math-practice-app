let fallbackCounter = 0

/** Creates a unique ID such as "question-1f3c…", for questions, attempts and sessions. */
export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  // Older browsers: time + counter + random is unique enough on one device.
  fallbackCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${fallbackCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
