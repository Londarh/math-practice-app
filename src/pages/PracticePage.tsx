import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useBlocker, useLocation, useNavigate } from 'react-router'
import { Button, ButtonLink } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'
import { ProgressBar } from '../components/practice/ProgressBar'
import { QuestionCard } from '../components/practice/QuestionCard'
import { useAppData } from '../hooks/useAppData'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { usePracticeSession } from '../hooks/usePracticeSession'
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
} from '../services/activeSessionStorage'
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
  // A new navigation (e.g. "Practice Again") gets a new key and starts a
  // fresh session; a page refresh keeps the key and restores the session.
  return (
    <PracticeSession
      key={location.key}
      config={config}
      locationKey={location.key}
    />
  )
}

function PracticeSession({
  config,
  locationKey,
}: {
  config: PracticeConfig
  locationKey: string
}) {
  const navigate = useNavigate()
  // Read once: the session saved before a refresh of this same page, if any.
  const [restored] = useState(() => loadActiveSession(locationKey))
  const {
    state,
    session,
    attempts,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isActive,
    error,
    recordResult,
    endSession,
  } = usePracticeSession(config, restored?.state)
  const { recordSessionProgress, settings } = useAppData()
  // The card turns over only if the setting allows it and the device has
  // not asked for reduced motion; otherwise the sides simply swap.
  const reducedMotion = usePrefersReducedMotion()
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const isReview = Boolean(config.reviewPatterns)

  // Save every answer as soon as it is given, so a closed tab loses nothing.
  useEffect(() => {
    recordSessionProgress(session, attempts)
  }, [session, attempts, recordSessionProgress])

  // Keep the session in progress saved, so a refresh can restore it, and
  // forget it once the session is over.
  const cardState = useRef({
    selectedAnswer: restored?.selectedAnswer ?? null,
    isCardFlipped: restored?.isCardFlipped ?? false,
  })
  useEffect(() => {
    if (state.isActive) {
      saveActiveSession({ locationKey, state, ...cardState.current })
    } else {
      clearActiveSession()
    }
  }, [state, locationKey])
  const handleCardStateChange = useCallback(
    (selectedAnswer: number | null, isCardFlipped: boolean) => {
      cardState.current = { selectedAnswer, isCardFlipped }
      if (state.isActive) {
        saveActiveSession({ locationKey, state, selectedAnswer, isCardFlipped })
      }
    },
    [state, locationKey],
  )

  // Ask before leaving a session that is still going. Declared before the
  // summary effect below, so a finished session is never blocked.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isActive && currentLocation.pathname !== nextLocation.pathname,
  )

  function leaveSession() {
    // Answers are already saved; close the session record and go.
    recordSessionProgress(
      { ...session, completedAt: new Date().toISOString() },
      attempts,
    )
    clearActiveSession()
    blocker.proceed?.()
  }

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
        {restored && (
          <p className="practice-page__notice" role="status">
            <span aria-hidden="true">👋 </span>
            Welcome back! We kept your place in this session.
          </p>
        )}
        <div className="practice-page__status">
          <p className="practice-page__details">
            <span className="practice-page__chip">
              {isReview
                ? 'Mistake review'
                : `Level ${config.difficulty}: ${DIFFICULTY_LABELS[config.difficulty]}`}
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
          animate={settings.cardAnimationEnabled && !reducedMotion}
          showExplanation={settings.showExplanations}
          initialSelectedAnswer={
            restored?.state.currentQuestion?.id === currentQuestion.id
              ? restored.selectedAnswer
              : null
          }
          initialFlipped={
            restored?.state.currentQuestion?.id === currentQuestion.id &&
            restored.isCardFlipped
          }
          onCardStateChange={handleCardStateChange}
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

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Leave this session?"
        message={`Your ${session.attempted === 1 ? 'answer is' : 'answers are'} saved, but leaving will end this session.`}
        confirmLabel="End and leave"
        cancelLabel="Keep practicing"
        onConfirm={leaveSession}
        onCancel={() => blocker.reset?.()}
      />
    </PageContainer>
  )
}
