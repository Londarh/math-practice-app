import type { DifficultyLevel, MathOperation } from '../types/question'
import type { SessionLength } from '../types/session'

export const ALL_OPERATIONS: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]

export const ALL_DIFFICULTIES: DifficultyLevel[] = [1, 2, 3, 4]

export const SESSION_LENGTH_OPTIONS: SessionLength[] = [5, 10, 20, 'continuous']

export const OPERATION_LABELS: Record<MathOperation, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
}

export const OPERATION_SYMBOLS: Record<MathOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}

/** Words used when reading a question aloud to screen readers. */
export const OPERATION_WORDS: Record<MathOperation, string> = {
  addition: 'plus',
  subtraction: 'minus',
  multiplication: 'times',
  division: 'divided by',
}

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Intermediate',
  4: 'Advanced',
}

export const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
  1: 'Numbers up to 10. Times tables up to 5.',
  2: 'Numbers up to 50. Times tables up to 10.',
  3: 'Numbers up to 100. Division up to 144.',
  4: 'Numbers up to 1,000. Two-digit times tables.',
}

export function sessionLengthLabel(length: SessionLength): string {
  return length === 'continuous' ? 'Continuous' : `${length} questions`
}
