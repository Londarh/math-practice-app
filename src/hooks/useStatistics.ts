import { useMemo } from 'react'
import { recentSessions } from '../services/statisticsService'
import { useAppData } from './useAppData'

/** Totals and recent sessions for the statistics page. */
export function useStatistics() {
  const { statistics, sessions, resetStatistics } = useAppData()
  const recent = useMemo(() => recentSessions(sessions), [sessions])
  return {
    statistics,
    recentSessions: recent,
    hasPractice: statistics.attempted > 0 || recent.length > 0,
    resetStatistics,
  }
}
