import { useContext, useSyncExternalStore } from 'react'
import { AppStoreContext } from '../app/appContext'

/** The saved app data (settings, history, …) and the actions that change it. */
export function useAppData() {
  const store = useContext(AppStoreContext)
  if (!store) throw new Error('useAppData must be used inside <AppProvider>')
  const state = useSyncExternalStore(store.subscribe, store.getState)
  return {
    ...state,
    recordSessionProgress: store.recordSessionProgress,
    resetStatistics: store.resetStatistics,
    updateSettings: store.updateSettings,
    clearAllData: store.clearAllData,
    dismissStorageWarning: store.dismissStorageWarning,
  }
}
