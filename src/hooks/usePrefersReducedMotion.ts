import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function getMediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY)
    : null
}

function subscribe(onChange: () => void) {
  const query = getMediaQuery()
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

const getSnapshot = () => getMediaQuery()?.matches ?? false

/** True when the device asks for less motion; updates if the setting changes. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
