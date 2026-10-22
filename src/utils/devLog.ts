/**
 * Logs problems for developers. Silent in production (no technical details
 * reach students) and in tests (to keep their output readable).
 */
export function logDevError(message: string, error?: unknown) {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.error(`[Math Practice] ${message}`, error ?? '')
  }
}
