import type { Question } from '../types/question'
import { formatNumber, OPERATION_SYMBOLS } from './labels'

/** The finished equation, e.g. "7 × 8 = 56". */
export function formatEquation(question: Question): string {
  const { operation, firstOperand, secondOperand, correctAnswer } = question
  return `${formatNumber(firstOperand)} ${OPERATION_SYMBOLS[operation]} ${formatNumber(secondOperand)} = ${formatNumber(correctAnswer)}`
}

/** A short, child-friendly hint showing why the answer is right. */
export function explainQuestion(question: Question): string {
  const a = formatNumber(question.firstOperand)
  const b = formatNumber(question.secondOperand)
  const answer = formatNumber(question.correctAnswer)

  switch (question.operation) {
    case 'addition':
      return `Check it backwards: ${answer} − ${b} = ${a}.`
    case 'subtraction':
      return `Check it backwards: ${answer} + ${b} = ${a}.`
    case 'multiplication':
      return `${a} groups of ${b} make ${answer}.`
    case 'division':
      return `${a} ÷ ${b} = ${answer} because ${b} × ${answer} = ${a}.`
  }
}
