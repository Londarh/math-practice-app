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
}

export function OperationSelector({ value, onChange }: OperationSelectorProps) {
  const allSelected = ALL_OPERATIONS.every((op) => value.includes(op))

  function toggle(operation: MathOperation) {
    const next = value.includes(operation)
      ? value.filter((op) => op !== operation)
      : [...value, operation]
    // Keep a stable order so the session summary always lists them the same way.
    onChange(ALL_OPERATIONS.filter((op) => next.includes(op)))
  }

  return (
    <fieldset className="setup-group">
      <legend className="setup-group__legend">1. Pick your operations</legend>
      <p className="setup-group__hint">Choose one or more.</p>
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
