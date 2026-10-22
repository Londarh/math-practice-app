import type { ReactNode } from 'react'
import './EmptyState.css'

interface EmptyStateProps {
  /** Decorative emoji or symbol; hidden from screen readers. */
  icon?: ReactNode
  title: string
  children?: ReactNode
}

export function EmptyState({ icon, title, children }: EmptyStateProps) {
  return (
    <section className="empty-state">
      {icon && (
        <div className="empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="empty-state__title">{title}</h2>
      {children}
    </section>
  )
}
