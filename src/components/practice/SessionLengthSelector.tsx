import type { SessionLength } from '../../types/session'
import { SESSION_LENGTH_OPTIONS, sessionLengthLabel } from '../../utils/labels'
import { OptionCard } from './OptionCard'

interface SessionLengthSelectorProps {
  value: SessionLength
  onChange: (length: SessionLength) => void
}

export function SessionLengthSelector({
  value,
  onChange,
}: SessionLengthSelectorProps) {
  return (
    <fieldset className="setup-group">
      <legend className="setup-group__legend">3. How many questions?</legend>
      <p className="setup-group__hint">
        Continuous keeps going until you press End Session.
      </p>
      <div className="setup-group__options">
        {SESSION_LENGTH_OPTIONS.map((length) => (
          <OptionCard
            key={length}
            type="radio"
            name="session-length"
            checked={value === length}
            onChange={() => onChange(length)}
            symbol={length === 'continuous' ? '∞' : length}
            title={sessionLengthLabel(length)}
          />
        ))}
      </div>
    </fieldset>
  )
}
