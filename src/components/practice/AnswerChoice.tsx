import { formatNumber } from '../../utils/labels'

interface AnswerChoiceProps {
  value: number
  selected: boolean
  /** True once the card is flipped, so the answer can no longer change. */
  disabled: boolean
  onSelect: (value: number) => void
}

export function AnswerChoice({
  value,
  selected,
  disabled,
  onSelect,
}: AnswerChoiceProps) {
  const label = formatNumber(value)
  return (
    <button
      type="button"
      className="answer-choice"
      aria-pressed={selected}
      aria-label={`Answer ${label}`}
      disabled={disabled}
      onClick={() => onSelect(value)}
    >
      <span className="answer-choice__value">{label}</span>
      {/* A check mark so the choice is not shown by color alone. */}
      <span className="answer-choice__check" aria-hidden="true">
        ✓
      </span>
    </button>
  )
}
