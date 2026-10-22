import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '../components/common/Button'
import { PageContainer } from '../components/layout/PageContainer'
import { DifficultySelector } from '../components/practice/DifficultySelector'
import { OperationSelector } from '../components/practice/OperationSelector'
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector'
import { DEFAULT_SETTINGS } from '../services/defaultSettings'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type { PracticeConfig, SessionLength } from '../types/session'
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

  const [operations, setOperations] = useState<MathOperation[]>(
    initial?.operations ?? DEFAULT_SETTINGS.defaultOperations,
  )
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    initial?.difficulty ?? DEFAULT_SETTINGS.defaultDifficulty,
  )
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    initial?.sessionLength ?? DEFAULT_SETTINGS.defaultSessionLength,
  )

  const canStart = operations.length > 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canStart) return
    const config: PracticeConfig = { operations, difficulty, sessionLength }
    navigate('/practice/session', { state: { config } })
  }

  return (
    <PageContainer title="Practice Setup">
      {locationState.notice && (
        <p className="practice-setup__notice" role="status">
          {locationState.notice}
        </p>
      )}
      <form className="practice-setup" onSubmit={handleSubmit}>
        <OperationSelector value={operations} onChange={setOperations} />
        <DifficultySelector value={difficulty} onChange={setDifficulty} />
        <SessionLengthSelector
          value={sessionLength}
          onChange={setSessionLength}
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
