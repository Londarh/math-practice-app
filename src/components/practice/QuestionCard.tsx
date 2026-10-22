import { useEffect, useRef, useState } from 'react'
import type { Question } from '../../types/question'
import { formatNumber } from '../../utils/labels'
import { CardBack } from './CardBack'
import { CardFront } from './CardFront'
import './QuestionCard.css'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  /** Null for continuous practice. */
  totalQuestions: number | null
  /** Called once, after the student says whether they got it right. */
  onResult: (selectedAnswer: number, correct: boolean) => void
  /** When false the card swaps sides instantly instead of turning over. */
  animate?: boolean
  showExplanation?: boolean
}

/**
 * A two-sided flash card. Give it a new `key` for each question so the
 * selected answer and flip state start fresh.
 */
export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onResult,
  animate = true,
  showExplanation = true,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const frontHeading = useRef<HTMLHeadingElement>(null)
  const backHeading = useRef<HTMLHeadingElement>(null)

  // Keep keyboard focus on the visible side so Tab continues from there.
  useEffect(() => {
    const target = isCardFlipped ? backHeading.current : frontHeading.current
    target?.focus({ preventScroll: true })
  }, [isCardFlipped])

  function handleSelect(value: number) {
    if (!isCardFlipped) setSelectedAnswer(value)
  }

  function handleFlip() {
    if (selectedAnswer !== null) setIsCardFlipped(true)
  }

  function handleResult(correct: boolean) {
    if (selectedAnswer !== null) onResult(selectedAnswer, correct)
  }

  const className = [
    'question-card',
    animate ? 'question-card--animated' : 'question-card--static',
    isCardFlipped && 'question-card--flipped',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className} aria-label="Question card">
      <div className="question-card__inner">
        <div
          className="question-card__face question-card__face--front"
          aria-hidden={isCardFlipped}
          inert={isCardFlipped}
        >
          <CardFront
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            isFlipped={isCardFlipped}
            onSelect={handleSelect}
            onFlip={handleFlip}
            headingRef={frontHeading}
          />
        </div>
        <div
          className="question-card__face question-card__face--back"
          aria-hidden={!isCardFlipped}
          inert={!isCardFlipped}
        >
          <CardBack
            question={question}
            selectedAnswer={selectedAnswer}
            showExplanation={showExplanation}
            onResult={handleResult}
            headingRef={backHeading}
          />
        </div>
      </div>
      {/* Announces the answer, since the flip itself is only visual. */}
      <p className="visually-hidden" role="status">
        {isCardFlipped && selectedAnswer !== null
          ? `The correct answer is ${formatNumber(question.correctAnswer)}. Your answer was ${formatNumber(selectedAnswer)}.`
          : ''}
      </p>
    </section>
  )
}
