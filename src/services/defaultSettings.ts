import type { AppSettings } from '../types/settings'

/** Settings used until the settings page and local storage are in place. */
export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: false,
  cardAnimationEnabled: true,
  showExplanations: true,
  defaultSessionLength: 10,
  defaultDifficulty: 1,
  defaultOperations: ['addition'],
  masteryThreshold: 3,
}
