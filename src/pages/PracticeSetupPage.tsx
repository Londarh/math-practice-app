import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '../components/common/Button'
import { PageContainer } from '../components/layout/PageContainer'
import { DifficultySelector } from '../components/practice/DifficultySelector'
import { OperationSelector } from '../components/practice/OperationSelector'
import { ReviewModeSelector } from '../components/practice/ReviewModeSelector'
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector'
import { useAppData } from '../hooks/useAppData'
import { buildReviewConfig, isActivePattern } from '../services/mistakeService'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type {
  PracticeConfig,
  PracticeMode,
  SessionLength,
} from '../types/session'
import { parsePracticeConfig } from '../utils/validation'
import './PracticeSetupPage.css'

export interface PracticeSetupLocationState {
  /** Options to pre-fill, e.g. when coming back from a session summary. */
  config?: PracticeConfig
  /** Friendly message explaining why the user was sent here. */
  notice?: string
}

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? {}) as PracticeSetupLocationState
  const initial = parsePracticeConfig(locationState.config)
  const { settings, mistakePatterns } = useAppData()
  const activeMistakes = mistakePatterns.filter(isActivePattern).length

  const [operations, setOperations] = useState<MathOperation[]>(
    initial?.operations ?? settings.defaultOperations,
  )
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    initial?.difficulty ?? settings.defaultDifficulty,
  )
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    initial?.sessionLength ?? settings.defaultSessionLength,
  )

  const [mode, setMode] = useState<PracticeMode>(
    initial?.reviewPatterns && activeMistakes > 0
      ? 'mistake-review'
      : 'regular',
  )
  const isReview = mode === 'mistake-review'

  const canStart = isReview ? activeMistakes > 0 : operations.length > 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canStart) return
    const config: PracticeConfig | null = isReview
      ? buildReviewConfig(mistakePatterns, sessionLength)
      : { operations, difficulty, sessionLength }
    if (config) navigate('/practice/session', { state: { config } })
  }

  return (
    <PageContainer title="Practice Setup">
      {locationState.notice && (
        <p className="practice-setup__notice" role="status">
          {locationState.notice}
        </p>
      )}
      <form className="practice-setup" onSubmit={handleSubmit}>
        <OperationSelector
          value={operations}
          onChange={setOperations}
          disabled={isReview}
          hint={
            isReview
              ? 'Mistake review uses the operations of your mistakes.'
              : undefined
          }
        />
        <DifficultySelector
          value={difficulty}
          onChange={setDifficulty}
          disabled={isReview}
          hint={
            isReview
              ? 'Mistake review uses the level each mistake was made at.'
              : undefined
          }
        />
        <SessionLengthSelector
          value={sessionLength}
          onChange={setSessionLength}
        />
        <ReviewModeSelector
          value={mode}
          onChange={setMode}
          activeMistakes={activeMistakes}
        />

        <div className="practice-setup__actions">
          <p
            id="practice-setup-message"
            className="practice-setup__message"
            aria-live="polite"
          >
            {canStart ? '' : 'Pick at least one operation to start.'}
          </p>
          <Button
            type="submit"
            variant="success"
            size="lg"
            icon="🚀"
            disabled={!canStart}
            aria-describedby="practice-setup-message"
          >
            Start Session
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
