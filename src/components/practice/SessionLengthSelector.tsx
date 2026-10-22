import type { SessionLength } from '../../types/session'
import { SESSION_LENGTH_OPTIONS, sessionLengthLabel } from '../../utils/labels'
import { OptionCard } from './OptionCard'

interface SessionLengthSelectorProps {
  value: SessionLength
  onChange: (length: SessionLength) => void
  legend?: string
  hint?: string
  /** Greys out the whole group, e.g. when mistake review picks the options. */
  disabled?: boolean
}

export function SessionLengthSelector({
  value,
  onChange,
  legend = '3. How many questions?',
  hint = 'Continuous keeps going until you press End Session.',
  disabled = false,
}: SessionLengthSelectorProps) {
  return (
    <fieldset className="setup-group" disabled={disabled}>
      <legend className="setup-group__legend">{legend}</legend>
      <p className="setup-group__hint">{hint}</p>
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
