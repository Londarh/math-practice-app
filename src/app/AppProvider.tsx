import { useState, type ReactNode } from 'react'
import { AppStoreContext } from './appContext'
import { createAppStore, type AppStore } from './appStore'

interface AppProviderProps {
  children: ReactNode
  /** A ready-made store, e.g. one backed by fake storage in tests. */
  store?: AppStore
}

/** Loads saved data once and shares it with every page. */
export function AppProvider({ children, store }: AppProviderProps) {
  const [appStore] = useState(() => store ?? createAppStore())
  return (
    <AppStoreContext.Provider value={appStore}>
      {children}
    </AppStoreContext.Provider>
  )
}
