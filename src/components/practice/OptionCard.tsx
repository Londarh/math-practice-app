import type { ReactNode } from 'react'
import './SetupOptions.css'

interface OptionCardProps {
  type: 'checkbox' | 'radio'
  name: string
  checked: boolean
  onChange: () => void
  title: string
  /** Big decorative symbol above the title; hidden from screen readers. */
  symbol?: ReactNode
  description?: string
  className?: string
  disabled?: boolean
  /** ID of text that explains this option, e.g. why it is disabled. */
  describedBy?: string
}

/** A native checkbox or radio button shown as a large, tappable card. */
export function OptionCard({
  type,
  name,
  checked,
  onChange,
  title,
  symbol,
  description,
  className,
  disabled,
  describedBy,
}: OptionCardProps) {
  return (
    <label className={['option-card', className].filter(Boolean).join(' ')}>
      <input
        className="option-card__input"
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-describedby={describedBy}
      />
      <span className="option-card__body">
        {symbol && (
          <span className="option-card__symbol" aria-hidden="true">
            {symbol}
          </span>
        )}
        <span className="option-card__title">{title}</span>
        {description && (
          <span className="option-card__description">{description}</span>
        )}
      </span>
      <span className="option-card__check" aria-hidden="true">
        ✓
      </span>
    </label>
  )
}
