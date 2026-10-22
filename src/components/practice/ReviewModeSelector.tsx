import { useId } from 'react'
import type { PracticeMode } from '../../types/session'
import { OptionCard } from './OptionCard'

interface ReviewModeSelectorProps {
  value: PracticeMode
  onChange: (mode: PracticeMode) => void
  /** Mistake patterns that are not mastered yet. */
  activeMistakes: number
}

export function ReviewModeSelector({
  value,
  onChange,
  activeMistakes,
}: ReviewModeSelectorProps) {
  const noteId = useId()
  const hasMistakes = activeMistakes > 0
  return (
    <fieldset className="setup-group">
      <legend className="setup-group__legend">4. What kind of practice?</legend>
      <p className="setup-group__hint">
        Mistake review asks questions similar to ones you missed before.
      </p>
      <div className="setup-group__options">
        <OptionCard
          type="radio"
          name="practice-mode"
          checked={value === 'regular'}
          onChange={() => onChange('regular')}
          symbol="✏️"
          title="Regular practice"
        />
        <OptionCard
          type="radio"
          name="practice-mode"
          checked={value === 'mistake-review'}
          onChange={() => onChange('mistake-review')}
          symbol="🎯"
          title="Practice my mistakes"
          description={
            hasMistakes
              ? `${activeMistakes} ${activeMistakes === 1 ? 'mistake' : 'mistakes'} to practice`
              : undefined
          }
          disabled={!hasMistakes}
          describedBy={noteId}
        />
      </div>
      <p id={noteId} className="setup-group__note" aria-live="polite">
        {hasMistakes
          ? value === 'mistake-review'
            ? 'Questions come from your mistakes, at the level you missed them. Operations and level are chosen for you.'
            : `You have ${activeMistakes} active ${activeMistakes === 1 ? 'mistake' : 'mistakes'} to practice.`
          : 'Mistake review is not available yet: you have no mistakes to practice. Questions you get wrong will show up here.'}
      </p>
    </fieldset>
  )
}
