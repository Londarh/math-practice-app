import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAppAt } from '../test/renderWithRouter'
import type { PracticeConfig } from '../types/session'

function startSession(config: PracticeConfig) {
  return renderAppAt({ pathname: '/practice/session', state: { config } })
}

/** Picks the first choice, flips the card and self-reports the result. */
async function answer(user: UserEvent, correct = true) {
  const choices = within(screen.getByRole('group', { name: 'Answer choices' }))
  await user.click(choices.getAllByRole('button')[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: correct ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

describe('PracticePage', () => {
  it('sends the student to setup when there is no session config', () => {
    renderAppAt('/practice/session')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      "Let's pick what to practice first!",
    )
  })

  it('redirects when the config is invalid', () => {
    renderAppAt({
      pathname: '/practice/session',
      state: { config: { operations: [], difficulty: 9 } },
    })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('shows the first question with the session details', () => {
    startSession({
      operations: ['division'],
      difficulty: 3,
      sessionLength: 5,
    })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Level 3: Intermediate')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('÷')
    expect(
      screen.queryByRole('button', { name: 'End Session' }),
    ).not.toBeInTheDocument()
  })

  it('updates the totals and progress after every answer', async () => {
    const { user } = startSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
    const progress = screen.getByRole('progressbar', {
      name: 'Session progress',
    })
    expect(progress).toHaveAttribute('aria-valuenow', '0')

    await answer(user, true)
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(progress).toHaveAttribute('aria-valuenow', '1')
    expect(progress).toHaveAttribute('aria-valuetext', '1 of 5 questions done')

    await answer(user, false)
    expect(screen.getByText('Question 3 of 5')).toBeInTheDocument()
    expect(screen.getByText(/1 right/)).toBeInTheDocument()
    expect(screen.getByText(/1 to practice/)).toBeInTheDocument()
  })

  it('resets the selected answer and flip state for the next question', async () => {
    const { user } = startSession({
      operations: ['multiplication'],
      difficulty: 2,
      sessionLength: 5,
    })

    await answer(user)

    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
    const choices = within(
      screen.getByRole('group', { name: 'Answer choices' }),
    )
    for (const choice of choices.getAllByRole('button')) {
      expect(choice).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('goes to the summary after the last question', async () => {
    const { user } = startSession({
      operations: ['addition', 'subtraction'],
      difficulty: 2,
      sessionLength: 5,
    })

    for (let i = 0; i < 5; i++) await answer(user, i < 3)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Session Summary' }),
    ).toBeInTheDocument()
  })

  describe('continuous practice', () => {
    const continuous: PracticeConfig = {
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 'continuous',
    }

    it('has no fixed total or progress bar', async () => {
      const { user } = startSession(continuous)

      expect(screen.getByText('Question 1')).toBeInTheDocument()
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

      for (let i = 0; i < 25; i++) await answer(user)
      expect(screen.getByText('Question 26')).toBeInTheDocument()
    })

    it('asks before ending and can keep practicing', async () => {
      const { user } = startSession(continuous)
      await answer(user)

      await user.click(screen.getByRole('button', { name: 'End Session' }))
      const dialog = screen.getByRole('alertdialog', {
        name: 'End this session?',
      })
      expect(dialog).toHaveTextContent('You have answered 1 question.')
      expect(
        within(dialog).getByRole('button', { name: 'Keep practicing' }),
      ).toHaveFocus()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(screen.getByText('Question 2')).toBeInTheDocument()
    })

    it('ends the session and shows the summary when confirmed', async () => {
      const { user } = startSession(continuous)
      await answer(user)

      await user.click(screen.getByRole('button', { name: 'End Session' }))
      await user.click(screen.getByRole('button', { name: 'Yes, end session' }))

      expect(
        screen.getByRole('heading', { level: 1, name: 'Session Summary' }),
      ).toBeInTheDocument()
    })
  })
})
