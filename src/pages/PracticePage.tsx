import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Button, ButtonLink } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'
import { ProgressBar } from '../components/practice/ProgressBar'
import { QuestionCard } from '../components/practice/QuestionCard'
import { useAppData } from '../hooks/useAppData'
import { usePracticeSession } from '../hooks/usePracticeSession'
import type { PracticeConfig, SessionResult } from '../types/session'
import { DIFFICULTY_LABELS, OPERATION_LABELS } from '../utils/labels'
import { playResultSound } from '../utils/sound'
import { parsePracticeConfig } from '../utils/validation'
import type { PracticeSetupLocationState } from './PracticeSetupPage'
import './PracticePage.css'

export interface PracticeLocationState {
  config?: PracticeConfig
}

export function PracticePage() {
  const location = useLocation()
  const config = parsePracticeConfig(
    (location.state as PracticeLocationState | null)?.config,
  )

  if (!config) {
    const state: PracticeSetupLocationState = {
      notice: "Let's pick what to practice first!",
    }
    return <Navigate to="/practice/setup" replace state={state} />
  }
  // A new navigation (e.g. "Practice Again") starts a fresh session.
  return <PracticeSession key={location.key} config={config} />
}

function PracticeSession({ config }: { config: PracticeConfig }) {
  const navigate = useNavigate()
  const {
    session,
    attempts,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isActive,
    error,
    recordResult,
    endSession,
  } = usePracticeSession(config)
  const { recordSessionProgress, settings } = useAppData()
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const isReview = Boolean(config.reviewItems)

  // Save every answer as soon as it is given, so a closed tab loses nothing.
  useEffect(() => {
    recordSessionProgress(session, attempts)
  }, [session, attempts, recordSessionProgress])

  // When the session finishes, show the summary. Replace the history entry so
  // Back does not drop the student into a finished session.
  useEffect(() => {
    if (isActive) return
    // A session that failed before any answers shows the error instead.
    if (error && attempts.length === 0) return
    const result: SessionResult = { config, session, attempts }
    navigate('/practice/summary', { replace: true, state: { result } })
  }, [isActive, error, config, session, attempts, navigate])

  if (error && attempts.length === 0) {
    return (
      <PageContainer title="Practice">
        <EmptyState icon="🤔" title="Something went wrong">
          <p>{error}</p>
          <ButtonLink to="/practice/setup" state={{ config }} variant="primary">
            Change Settings
          </ButtonLink>
        </EmptyState>
      </PageContainer>
    )
  }

  if (!currentQuestion) return null

  const operations = config.operations
    .map((op) => OPERATION_LABELS[op])
    .join(', ')

  return (
    <PageContainer title={isReview ? 'Practice Mistakes' : 'Practice'}>
      <div className="practice-page">
        <div className="practice-page__status">
          <p className="practice-page__details">
            <span className="practice-page__chip">
              Level {config.difficulty}: {DIFFICULTY_LABELS[config.difficulty]}
            </span>
            <span className="practice-page__chip">{operations}</span>
          </p>
          {totalQuestions !== null && (
            <ProgressBar completed={session.attempted} total={totalQuestions} />
          )}
          <p className="practice-page__score">
            <span>✅ {session.correct} right</span>
            <span>🔁 {session.incorrect} to practice</span>
          </p>
        </div>

        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={totalQuestions}
          onResult={(selectedAnswer, correct) => {
            if (settings.soundEnabled) playResultSound(correct)
            recordResult(selectedAnswer, correct)
          }}
          animate={settings.cardAnimationEnabled}
          showExplanation={settings.showExplanations}
        />

        {totalQuestions === null && (
          <div className="practice-page__end">
            <Button
              variant="secondary"
              icon="🏁"
              onClick={() => setConfirmingEnd(true)}
            >
              End Session
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmingEnd}
        title="End this session?"
        message={`You have answered ${session.attempted} ${session.attempted === 1 ? 'question' : 'questions'}. Do you want to stop and see how you did?`}
        confirmLabel="Yes, end session"
        cancelLabel="Keep practicing"
        onConfirm={() => {
          setConfirmingEnd(false)
          endSession()
        }}
        onCancel={() => setConfirmingEnd(false)}
      />
    </PageContainer>
  )
}
