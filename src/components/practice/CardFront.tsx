import type { Ref } from 'react'
import type { Question } from '../../types/question'
import { spokenQuestionText } from '../../utils/labels'
import { Button } from '../common/Button'
import { AnswerChoice } from './AnswerChoice'

interface CardFrontProps {
  question: Question
  questionNumber: number
  /** Null for continuous practice, which has no fixed total. */
  totalQuestions: number | null
  selectedAnswer: number | null
  isFlipped: boolean
  onSelect: (value: number) => void
  onFlip: () => void
  headingRef?: Ref<HTMLHeadingElement>
}

export function CardFront({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  isFlipped,
  onSelect,
  onFlip,
  headingRef,
}: CardFrontProps) {
  const { operation, firstOperand, secondOperand } = question
  return (
    <>
      <p className="question-card__count">
        {totalQuestions === null
          ? `Question ${questionNumber}`
          : `Question ${questionNumber} of ${totalQuestions}`}
      </p>
      <h2
        ref={headingRef}
        className="question-card__problem"
        tabIndex={-1}
        aria-label={spokenQuestionText(operation, firstOperand, secondOperand)}
      >
        {question.displayText}
      </h2>
      <div
        className="question-card__choices"
        role="group"
        aria-label="Answer choices"
      >
        {question.choices.map((choice) => (
          <AnswerChoice
            key={choice}
            value={choice}
            selected={choice === selectedAnswer}
            disabled={isFlipped}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="question-card__actions">
        <Button
          variant="purple"
          size="lg"
          icon="🔄"
          disabled={selectedAnswer === null || isFlipped}
          onClick={onFlip}
        >
          Flip Card
        </Button>
        {selectedAnswer === null && (
          <p className="question-card__hint">Pick an answer, then flip!</p>
        )}
      </div>
    </>
  )
}
