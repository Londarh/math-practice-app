import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Question } from '../../types/question'
import { QuestionCard } from './QuestionCard'

const question: Question = {
  id: 'question-1',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}

function renderCard(props: Partial<Parameters<typeof QuestionCard>[0]> = {}) {
  const onResult = vi.fn()
  const result = render(
    <QuestionCard
      question={question}
      questionNumber={3}
      totalQuestions={10}
      onResult={onResult}
      {...props}
    />,
  )
  return { user: userEvent.setup(), onResult, ...result }
}

const choice = (value: number) =>
  screen.getByRole('button', { name: `Answer ${value}` })
const flipButton = () => screen.getByRole('button', { name: 'Flip Card' })

describe('QuestionCard front', () => {
  it('shows the question, four choices and the question number', () => {
    renderCard()

    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Question 3 of 10: 7 times 8 equals what?',
      }),
    ).toHaveTextContent('7 × 8 = ?')
    for (const value of question.choices) {
      expect(choice(value)).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('shows only the question number for continuous practice', () => {
    renderCard({ totalQuestions: null, questionNumber: 12 })

    expect(screen.getByText('Question 12')).toBeInTheDocument()
  })

  it('disables Flip Card until an answer is selected', async () => {
    const { user } = renderCard()
    expect(flipButton()).toBeDisabled()

    await user.click(choice(54))

    expect(choice(54)).toHaveAttribute('aria-pressed', 'true')
    expect(flipButton()).toBeEnabled()
  })

  it('lets the answer change before flipping', async () => {
    const { user } = renderCard()

    await user.click(choice(54))
    await user.click(choice(56))

    expect(choice(54)).toHaveAttribute('aria-pressed', 'false')
    expect(choice(56)).toHaveAttribute('aria-pressed', 'true')
  })

  it('hides the back of the card before flipping', () => {
    renderCard()

    expect(
      screen.queryByRole('button', { name: 'I Got It Right' }),
    ).not.toBeInTheDocument()
  })
})

describe('QuestionCard back', () => {
  async function flipWith(value: number, props = {}) {
    const rendered = renderCard(props)
    await rendered.user.click(choice(value))
    await rendered.user.click(flipButton())
    return rendered
  }

  it('reveals the equation, the correct answer and the chosen answer', async () => {
    await flipWith(54)

    expect(screen.getByRole('heading', { name: '7 × 8 = 56' })).toHaveFocus()
    expect(screen.getByText('Correct answer').nextSibling).toHaveTextContent(
      '56',
    )
    expect(screen.getByText('Your answer').nextSibling).toHaveTextContent('54')
    expect(screen.getByText(/Nice try/)).toBeInTheDocument()
    expect(screen.getByText(/7 groups of 8 make 56/)).toBeInTheDocument()
  })

  it('announces the revealed answer to screen readers', async () => {
    await flipWith(56)

    expect(screen.getByRole('status')).toHaveTextContent(
      'The correct answer is 56. Your answer was 56.',
    )
    expect(screen.getByText(/Great job/)).toBeInTheDocument()
  })

  it('hides the front so the answer can no longer change', async () => {
    await flipWith(54)

    expect(
      screen.queryByRole('button', { name: 'Answer 56' }),
    ).not.toBeInTheDocument()
  })

  it('can hide the explanation', async () => {
    await flipWith(56, { showExplanation: false })

    expect(screen.queryByText(/groups of/)).not.toBeInTheDocument()
  })

  it.each([
    ['I Got It Right', true],
    ['I Got It Wrong', false],
  ])('"%s" reports the result once', async (name, correct) => {
    const { user, onResult } = await flipWith(54)

    await user.click(screen.getByRole('button', { name }))

    expect(onResult).toHaveBeenCalledExactlyOnceWith(54, correct)
  })

  it('locks both buttons after one is pressed', async () => {
    const { user, onResult } = await flipWith(56)

    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('button', { name: 'I Got It Wrong' }),
    ).toBeDisabled()
  })

  it.each([true, false])('works with animation set to %s', async (animate) => {
    const { container } = await flipWith(56, { animate })

    const card = container.querySelector('.question-card')
    expect(card).toHaveClass(
      animate ? 'question-card--animated' : 'question-card--static',
    )
    expect(card).toHaveClass('question-card--flipped')
    expect(
      screen.getByRole('button', { name: 'I Got It Right' }),
    ).toBeInTheDocument()
  })
})

describe('QuestionCard reset', () => {
  it('starts fresh when given a new key for the next question', async () => {
    const { user, rerender } = renderCard()
    await user.click(choice(56))
    await user.click(flipButton())

    rerender(
      <QuestionCard
        key="next"
        question={{ ...question, id: 'question-2' }}
        questionNumber={4}
        totalQuestions={10}
        onResult={() => {}}
      />,
    )

    expect(choice(56)).toHaveAttribute('aria-pressed', 'false')
    expect(flipButton()).toBeDisabled()
  })
})

describe('QuestionCard keyboard shortcuts', () => {
  it('selects answers with the number keys 1–4', async () => {
    const { user } = renderCard()

    await user.keyboard('2')
    expect(choice(54)).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard('4')
    expect(choice(64)).toHaveAttribute('aria-pressed', 'true')
    expect(choice(54)).toHaveAttribute('aria-pressed', 'false')
    expect(flipButton()).toBeEnabled()
  })

  it('shows each shortcut and exposes it to assistive technology', () => {
    renderCard()

    question.choices.forEach((value, index) => {
      expect(choice(value)).toHaveAttribute(
        'aria-keyshortcuts',
        String(index + 1),
      )
      expect(choice(value)).toHaveTextContent(String(index + 1))
    })
  })

  it('ignores other keys and keys with modifiers', async () => {
    const { user } = renderCard()

    await user.keyboard('5')
    await user.keyboard('{Control>}1{/Control}')

    for (const value of question.choices) {
      expect(choice(value)).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('does not interfere with typing in a form field', async () => {
    const { user } = renderCard()
    render(<input aria-label="Notes" />)

    await user.click(screen.getByRole('textbox', { name: 'Notes' }))
    await user.keyboard('3')

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('3')
    expect(choice(56)).toHaveAttribute('aria-pressed', 'false')
  })

  it('cannot change the answer after the card is flipped', async () => {
    const { user } = renderCard()
    await user.keyboard('1')
    await user.click(flipButton())

    await user.keyboard('3')

    expect(screen.getByText('Your answer').nextSibling).toHaveTextContent('48')
  })

  it('can be answered with the keyboard alone', async () => {
    const { user, onResult } = renderCard()

    await user.keyboard('3')
    flipButton().focus()
    await user.keyboard('{Enter}')
    // Focus moves to the back's heading; Tab reaches "I Got It Right".
    await user.tab()
    expect(screen.getByRole('button', { name: 'I Got It Right' })).toHaveFocus()
    await user.keyboard(' ')

    expect(onResult).toHaveBeenCalledExactlyOnceWith(56, true)
  })
})
