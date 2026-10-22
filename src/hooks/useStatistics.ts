import { useMemo } from 'react'
import {
  recentSessions,
  summarizeMistakes,
} from '../services/statisticsService'
import { useAppData } from './useAppData'

/** Totals, recent sessions and mistake details for the statistics page. */
export function useStatistics() {
  const { statistics, sessions, mistakePatterns, settings, resetStatistics } =
    useAppData()
  const recent = useMemo(() => recentSessions(sessions), [sessions])
  const mistakes = useMemo(
    () => summarizeMistakes(mistakePatterns, statistics),
    [mistakePatterns, statistics],
  )
  return {
    statistics,
    recentSessions: recent,
    mistakes,
    masteryThreshold: settings.masteryThreshold,
    hasPractice: statistics.attempted > 0 || recent.length > 0,
    resetStatistics,
  }
}
