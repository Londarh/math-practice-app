import { useLocation, useNavigate } from 'react-router'
import { Button, ButtonLink } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'
import { SessionSummary } from '../components/practice/SessionSummary'
import { useAppData } from '../hooks/useAppData'
import { buildReviewConfig, isActivePattern } from '../services/mistakeService'
import type { PracticeConfig } from '../types/session'
import { parseSessionResult } from '../utils/validation'
import './SessionSummaryPage.css'

export function SessionSummaryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mistakePatterns } = useAppData()
  const result = parseSessionResult(
    (location.state as { result?: unknown } | null)?.result,
  )

  if (!result) {
    return (
      <PageContainer title="Session Summary">
        <EmptyState icon="🏁" title="No session to show yet">
          <p>Finish a practice session and your results will appear here.</p>
          <ButtonLink to="/practice/setup" variant="success" icon="🚀">
            Start Practice
          </ButtonLink>
        </EmptyState>
      </PageContainer>
    )
  }

  const { config } = result
  const isReview = Boolean(config.reviewPatterns)
  const activeMistakes = mistakePatterns.filter(isActivePattern).length
  // "Change Settings" goes back to normal practice, not a review session.
  const setupConfig: PracticeConfig = {
    operations: config.operations,
    difficulty: config.difficulty,
    sessionLength: config.sessionLength,
  }

  function practiceMistakes() {
    // Built from the saved patterns, so it includes this session's mistakes
    // and leaves out anything mastered since.
    const reviewConfig = buildReviewConfig(
      mistakePatterns,
      config.sessionLength,
    )
    if (reviewConfig) {
      navigate('/practice/session', { state: { config: reviewConfig } })
    }
  }

  return (
    <PageContainer title="Session Summary">
      <div className="summary-page">
        <SessionSummary result={result} />

        <nav className="summary-page__actions" aria-label="What's next">
          {isReview && activeMistakes > 0 ? (
            <Button
              variant="success"
              size="lg"
              icon="🔄"
              onClick={practiceMistakes}
            >
              Practice Again
            </Button>
          ) : (
            <ButtonLink
              to="/practice/session"
              state={{ config: isReview ? setupConfig : config }}
              variant="success"
              size="lg"
              icon="🔄"
            >
              Practice Again
            </ButtonLink>
          )}
          <div className="summary-page__mistakes">
            <Button
              variant="purple"
              size="lg"
              icon="🎯"
              disabled={activeMistakes === 0}
              aria-describedby="summary-mistakes-note"
              onClick={practiceMistakes}
            >
              Practice Mistakes
            </Button>
            <p id="summary-mistakes-note" className="summary-page__note">
              {activeMistakes === 0
                ? 'No mistakes to practice. Awesome!'
                : `${activeMistakes} ${activeMistakes === 1 ? 'mistake' : 'mistakes'} to practice with similar questions.`}
            </p>
          </div>
          <ButtonLink
            to="/practice/setup"
            state={{ config: setupConfig }}
            variant="primary"
            icon="🛠️"
          >
            Change Settings
          </ButtonLink>
          <ButtonLink to="/statistics" variant="primary" icon="📊">
            View Statistics
          </ButtonLink>
          <ButtonLink to="/" variant="secondary" icon="🏠">
            Return Home
          </ButtonLink>
        </nav>
      </div>
    </PageContainer>
  )
}
