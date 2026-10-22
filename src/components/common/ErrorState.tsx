import type { ReactNode } from 'react'
import { Button, ButtonLink } from './Button'
import { EmptyState } from './EmptyState'

interface ErrorStateProps {
  title?: string
  /** A short, friendly explanation; never technical details. */
  children?: ReactNode
  /** Shows a "Try Again" button that reloads the page. */
  canRetry?: boolean
}

/** A friendly error message that always offers a safe way back home. */
export function ErrorState({
  title = 'Oops! Something went wrong.',
  children,
  canRetry = false,
}: ErrorStateProps) {
  return (
    <EmptyState icon="🤔" title={title}>
      {children ?? (
        <p>Don't worry, your saved progress is safe. Let's try again.</p>
      )}
      <div className="error-state__actions">
        <ButtonLink to="/" variant="primary" icon="🏠">
          Go to Home
        </ButtonLink>
        {canRetry && (
          <Button
            variant="secondary"
            icon="🔄"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        )}
      </div>
    </EmptyState>
  )
}
