import type { DifficultyLevel, MathOperation } from './question'
import type { SessionLength } from './session'

export interface AppSettings {
  soundEnabled: boolean
  cardAnimationEnabled: boolean
  showExplanations: boolean
  defaultSessionLength: SessionLength
  defaultDifficulty: DifficultyLevel
  defaultOperations: MathOperation[]
  /** Correct similar answers needed before a mistake pattern counts as mastered */
  masteryThreshold: number
}
