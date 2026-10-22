import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../services/storageService'
import { makePattern } from '../test/fixtures'
import { renderAppAt } from '../test/renderWithRouter'
import type { PracticeAttempt, SessionResult } from '../types/session'

function attempt(
  overrides: Partial<PracticeAttempt> & Pick<PracticeAttempt, 'id'>,
): PracticeAttempt {
  return {
    questionId: `q-${overrides.id}`,
    operation: 'multiplication',
    firstOperand: 7,
    secondOperand: 8,
    correctAnswer: 56,
    selectedAnswer: 56,
    selfReportedCorrect: true,
    difficulty: 2,
    source: 'regular',
    attemptedAt: '2026-10-21T10:00:00.000Z',
    sessionId: 'session-1',
    ...overrides,
  }
}

const result: SessionResult = {
  config: {
    operations: ['multiplication', 'division'],
    difficulty: 2,
    sessionLength: 5,
  },
  session: {
    id: 'session-1',
    startedAt: '2026-10-21T09:55:00.000Z',
    completedAt: '2026-10-21T10:00:00.000Z',
    operations: ['multiplication', 'division'],
    difficulty: 2,
    sessionLength: 5,
    attempted: 5,
    correct: 3,
    incorrect: 2,
  },
  attempts: [
    attempt({ id: '1' }),
    attempt({ id: '2', selfReportedCorrect: false, selectedAnswer: 54 }),
    attempt({ id: '3' }),
    attempt({
      id: '4',
      operation: 'division',
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
      selfReportedCorrect: false,
      source: 'mistake-review',
    }),
    attempt({ id: '5', source: 'mistake-review' }),
  ],
}

/** Two unmastered mistakes saved from earlier practice. */
function seedMistakes() {
  localStorage.setItem(
    STORAGE_KEYS.mistakePatterns,
    JSON.stringify([
      makePattern(),
      makePattern({
        operation: 'division',
        firstOperand: 56,
        secondOperand: 7,
        correctAnswer: 8,
      }),
    ]),
  )
}

function renderSummary(data: SessionResult = result) {
  return renderAppAt({ pathname: '/practice/summary', state: { result: data } })
}

function stat(label: string) {
  return screen.getByText(label).closest('div')!.querySelector('dd')
}

const h1 = (name: string) => screen.getByRole('heading', { level: 1, name })

describe('SessionSummaryPage', () => {
  it('shows a friendly empty state when there is no session data', async () => {
    await renderAppAt('/practice/summary')

    expect(h1('Session Summary')).toBeInTheDocument()
    expect(screen.getByText('No session to show yet')).toBeInTheDocument()
  })

  it('shows totals, accuracy, operations, level and review count', async () => {
    await renderSummary()

    expect(stat('Questions attempted')).toHaveTextContent('5')
    expect(stat('Correct answers')).toHaveTextContent('3')
    expect(stat('Incorrect answers')).toHaveTextContent('2')
    expect(stat('Accuracy')).toHaveTextContent('60%')
    expect(stat('Operations practiced')).toHaveTextContent(
      'Multiplication, Division',
    )
    expect(stat('Difficulty level')).toHaveTextContent('Level 2: Easy')
    expect(stat('Mistake-review questions completed')).toHaveTextContent('2')
    expect(screen.getByText(/You are improving/)).toBeInTheDocument()
  })

  it('shows 0% for a session with no answers', async () => {
    await renderSummary({
      ...result,
      session: { ...result.session, attempted: 0, correct: 0, incorrect: 0 },
      attempts: [],
    })

    expect(stat('Accuracy')).toHaveTextContent('0%')
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
    expect(
      screen.getByText('No mistakes to practice. Awesome!'),
    ).toBeInTheDocument()
  })

  it('offers all five next steps', async () => {
    seedMistakes()
    await renderSummary()
    const actions = within(
      screen.getByRole('navigation', { name: "What's next" }),
    )

    expect(
      actions.getByRole('link', { name: 'Practice Again' }),
    ).toBeInTheDocument()
    expect(
      actions.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeEnabled()
    expect(
      actions.getByRole('link', { name: 'Change Settings' }),
    ).toBeInTheDocument()
    expect(
      actions.getByRole('link', { name: 'View Statistics' }),
    ).toBeInTheDocument()
    expect(
      actions.getByRole('link', { name: 'Return Home' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('2 mistakes to practice with similar questions.'),
    ).toBeInTheDocument()
  })

  it('Practice Again starts a new session with the same options', async () => {
    const { user } = await renderSummary()

    await user.click(screen.getByRole('link', { name: 'Practice Again' }))

    expect(h1('Practice')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('Level 2: Easy')).toBeInTheDocument()
  })

  it('disables Practice Mistakes when every mistake is mastered', async () => {
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([makePattern({ mastered: true, similarCorrectCount: 3 })]),
    )
    await renderSummary()

    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
    expect(
      screen.getByText('No mistakes to practice. Awesome!'),
    ).toBeInTheDocument()
  })

  it('Practice Mistakes starts a review of similar questions', async () => {
    seedMistakes()
    const { user } = await renderSummary()

    await user.click(screen.getByRole('button', { name: 'Practice Mistakes' }))

    expect(h1('Practice Mistakes')).toBeInTheDocument()
    expect(screen.getByText('Mistake review')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
  })

  it('Change Settings opens setup with the same options filled in', async () => {
    const { user } = await renderSummary()

    await user.click(screen.getByRole('link', { name: 'Change Settings' }))

    expect(h1('Practice Setup')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Easy/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '5 questions' })).toBeChecked()
  })

  it.each([
    ['View Statistics', 'Statistics'],
    ['Return Home', 'Hi there, math explorer!'],
  ])('"%s" opens the right page', async (link, heading) => {
    const { user } = await renderSummary()

    await user.click(screen.getByRole('link', { name: link }))

    // Statistics loads on demand, so wait for the page.
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })
})

describe('full practice flow', () => {
  async function answer(user: UserEvent, correct: boolean) {
    const choices = within(
      screen.getByRole('group', { name: 'Answer choices' }),
    )
    await user.click(choices.getAllByRole('button')[0])
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(
      screen.getByRole('button', {
        name: correct ? 'I Got It Right' : 'I Got It Wrong',
      }),
    )
  }

  it('sets up, practices, sees the summary and reviews mistakes', async () => {
    const { user } = await renderAppAt('/practice/setup')

    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    // Miss exactly one question, so exactly one mistake pattern is made.
    let missed = ''
    for (let i = 0; i < 5; i++) {
      if (i === 1) {
        missed = screen.getByRole('heading', { level: 2 }).textContent!
      }
      await answer(user, i !== 1)
    }

    expect(h1('Session Summary')).toBeInTheDocument()
    expect(stat('Correct answers')).toHaveTextContent('4')
    expect(stat('Incorrect answers')).toHaveTextContent('1')
    expect(
      screen.getByText('1 mistake to practice with similar questions.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Practice Mistakes' }))

    expect(h1('Practice Mistakes')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    // A similar question, not a replay of the one that was missed.
    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(
      missed,
    )
    for (let i = 0; i < 5; i++) await answer(user, true)

    expect(h1('Session Summary')).toBeInTheDocument()
    expect(stat('Mistake-review questions completed')).toHaveTextContent('5')
    expect(
      stat('Mistake-review questions answered correctly'),
    ).toHaveTextContent('5')
    // Three right answers (the default threshold) mastered the mistake.
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
    const [pattern] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.mistakePatterns)!,
    )
    expect(pattern).toMatchObject({ similarCorrectCount: 5, mastered: true })
  })
})
