import type { AppSettings } from '../types/settings'

/** Allowed range for the mastery threshold on the settings page. */
export const MIN_MASTERY_THRESHOLD = 1
export const MAX_MASTERY_THRESHOLD = 10

/** Settings used on a first visit, and whenever saved settings are unusable. */
export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: false,
  cardAnimationEnabled: true,
  showExplanations: true,
  defaultSessionLength: 10,
  defaultDifficulty: 1,
  defaultOperations: ['addition'],
  masteryThreshold: 3,
}
