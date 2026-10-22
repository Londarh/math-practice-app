import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  // Every test starts as a first visit with nothing saved.
  localStorage.clear()
  sessionStorage.clear()
})
