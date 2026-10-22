import { formatNumber } from '../../utils/labels'

interface AnswerChoiceProps {
  value: number
  /** Number key that also selects this choice. */
  shortcut: number
  selected: boolean
  /** True once the card is flipped, so the answer can no longer change. */
  disabled: boolean
  onSelect: (value: number) => void
}

export function AnswerChoice({
  value,
  shortcut,
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
      aria-keyshortcuts={String(shortcut)}
      disabled={disabled}
      onClick={() => onSelect(value)}
    >
      <span className="answer-choice__key" aria-hidden="true">
        {shortcut}
      </span>
      <span className="answer-choice__value">{label}</span>
      {/* A check mark so the choice is not shown by color alone. */}
      <span className="answer-choice__check" aria-hidden="true">
        ✓
      </span>
    </button>
  )
}
