import type { DifficultyLevel } from '../../types/question'
import {
  ALL_DIFFICULTIES,
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
} from '../../utils/labels'
import { OptionCard } from './OptionCard'

const levelIcons: Record<DifficultyLevel, string> = {
  1: '🐣',
  2: '🐢',
  3: '🦊',
  4: '🦁',
}

interface DifficultySelectorProps {
  value: DifficultyLevel
  onChange: (difficulty: DifficultyLevel) => void
}

export function DifficultySelector({
  value,
  onChange,
}: DifficultySelectorProps) {
  return (
    <fieldset className="setup-group">
      <legend className="setup-group__legend">2. Pick a level</legend>
      <p className="setup-group__hint">Start easy and level up!</p>
      <div className="setup-group__options setup-group__options--wide">
        {ALL_DIFFICULTIES.map((level) => (
          <OptionCard
            key={level}
            type="radio"
            name="difficulty"
            checked={value === level}
            onChange={() => onChange(level)}
            symbol={levelIcons[level]}
            title={`Level ${level}: ${DIFFICULTY_LABELS[level]}`}
            description={DIFFICULTY_DESCRIPTIONS[level]}
          />
        ))}
      </div>
    </fieldset>
  )
}
