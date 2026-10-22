import { useState, type Ref } from 'react'
import type { Question } from '../../types/question'
import { explainQuestion, formatEquation } from '../../utils/explanations'
import { formatNumber } from '../../utils/labels'
import { Button } from '../common/Button'

interface CardBackProps {
  question: Question
  selectedAnswer: number | null
  showExplanation: boolean
  onResult: (correct: boolean) => void
  headingRef?: Ref<HTMLHeadingElement>
}

export function CardBack({
  question,
  selectedAnswer,
  showExplanation,
  onResult,
  headingRef,
}: CardBackProps) {
  // Once one button is pressed, both lock so the attempt is recorded once.
  const [reported, setReported] = useState(false)
  const matched = selectedAnswer === question.correctAnswer

  function report(correct: boolean) {
    if (reported) return
    setReported(true)
    onResult(correct)
  }

  return (
    <>
      <p className="question-card__count">The answer is…</p>
      <h2 ref={headingRef} className="question-card__problem" tabIndex={-1}>
        {formatEquation(question)}
      </h2>
      <dl className="question-card__answers">
        <div>
          <dt>Correct answer</dt>
          <dd>{formatNumber(question.correctAnswer)}</dd>
        </div>
        <div>
          <dt>Your answer</dt>
          <dd>
            {selectedAnswer === null ? '—' : formatNumber(selectedAnswer)}
          </dd>
        </div>
      </dl>
      <p className="question-card__feedback">
        {matched
          ? '🎉 Great job! Your answer matches.'
          : '🌱 Nice try! Every mistake helps you learn.'}
      </p>
      {showExplanation && (
        <p className="question-card__explanation">
          💡 {explainQuestion(question)}
        </p>
      )}
      <p className="question-card__hint">How did you do?</p>
      <div className="question-card__actions question-card__actions--pair">
        <Button
          variant="success"
          size="lg"
          icon="👍"
          disabled={reported}
          onClick={() => report(true)}
        >
          I Got It Right
        </Button>
        <Button
          variant="secondary"
          size="lg"
          icon="🔁"
          disabled={reported}
          onClick={() => report(false)}
        >
          I Got It Wrong
        </Button>
      </div>
    </>
  )
}
