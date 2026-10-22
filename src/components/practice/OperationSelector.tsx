import type { MathOperation } from '../../types/question'
import {
  ALL_OPERATIONS,
  OPERATION_LABELS,
  OPERATION_SYMBOLS,
} from '../../utils/labels'
import { OptionCard } from './OptionCard'

interface OperationSelectorProps {
  value: MathOperation[]
  onChange: (operations: MathOperation[]) => void
  legend?: string
  hint?: string
  /** Greys out the whole group, e.g. when mistake review picks the options. */
  disabled?: boolean
}

export function OperationSelector({
  value,
  onChange,
  legend = '1. Pick your operations',
  hint = 'Choose one or more.',
  disabled = false,
}: OperationSelectorProps) {
  const allSelected = ALL_OPERATIONS.every((op) => value.includes(op))

  function toggle(operation: MathOperation) {
    const next = value.includes(operation)
      ? value.filter((op) => op !== operation)
      : [...value, operation]
    // Keep a stable order so the session summary always lists them the same way.
    onChange(ALL_OPERATIONS.filter((op) => next.includes(op)))
  }

  return (
    <fieldset className="setup-group" disabled={disabled}>
      <legend className="setup-group__legend">{legend}</legend>
      <p className="setup-group__hint">{hint}</p>
      <div className="setup-group__options">
        {ALL_OPERATIONS.map((operation) => (
          <OptionCard
            key={operation}
            type="checkbox"
            name="operations"
            checked={value.includes(operation)}
            onChange={() => toggle(operation)}
            symbol={OPERATION_SYMBOLS[operation]}
            title={OPERATION_LABELS[operation]}
          />
        ))}
      </div>
      <div className="setup-group__all">
        <OptionCard
          type="checkbox"
          name="all-operations"
          className="option-card--all"
          checked={allSelected}
          onChange={() => onChange(allSelected ? [] : [...ALL_OPERATIONS])}
          symbol="🎲"
          title="Mixed: all operations"
        />
      </div>
    </fieldset>
  )
}
