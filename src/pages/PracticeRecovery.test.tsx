import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ACTIVE_SESSION_KEY } from '../services/activeSessionStorage'
import { STORAGE_KEYS } from '../services/storageService'
import { renderAppAt } from '../test/renderWithRouter'
import type { PracticeConfig } from '../types/session'

const config: PracticeConfig = {
  operations: ['multiplication'],
  difficulty: 2,
  sessionLength: 5,
}
const sessionEntry = { pathname: '/practice/session', state: { config } }

const choices = () =>
  within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole(
    'button',
  )
const heading = () => screen.getByRole('heading', { level: 2 }).textContent

async function answer(user: UserEvent, correct = true) {
  await user.click(choices()[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: correct ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

const storedAttempts = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts) ?? '[]')

/** Unmounts the app and renders it again at the same history entry. */
function refresh(rendered: ReturnType<typeof renderAppAt>) {
  rendered.unmount()
  return renderAppAt(sessionEntry)
}

describe('session recovery after a refresh', () => {
  it('restores the session, its totals and the current question', async () => {
    const first = renderAppAt(sessionEntry)
    await answer(first.user, true)
    await answer(first.user, false)
    const current = heading()

    const second = refresh(first)

    expect(screen.getByText('Question 3 of 5')).toBeInTheDocument()
    expect(heading()).toBe(current)
    expect(screen.getByText('✅ 1 right')).toBeInTheDocument()
    expect(screen.getByText('🔁 1 to practice')).toBeInTheDocument()
    expect(screen.getByText(/Welcome back!/)).toBeInTheDocument()

    // Carrying on does not count the earlier answers twice.
    await answer(second.user)
    expect(storedAttempts()).toHaveLength(3)
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!),
    ).toHaveLength(1)
  })

  it('restores the selected answer and the flipped card', async () => {
    const first = renderAppAt(sessionEntry)
    const picked = choices()[2].querySelector(
      '.answer-choice__value',
    )!.textContent!
    await first.user.click(choices()[2])
    await first.user.click(screen.getByRole('button', { name: 'Flip Card' }))

    refresh(first)

    expect(
      screen.getByRole('button', { name: 'I Got It Right' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Your answer').nextSibling).toHaveTextContent(
      picked,
    )
  })

  it('restores a selected answer before the flip', async () => {
    const first = renderAppAt(sessionEntry)
    await first.user.click(choices()[1])

    refresh(first)

    expect(choices()[1]).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeEnabled()
  })

  it('forgets the session once it is complete', async () => {
    const { user } = renderAppAt(sessionEntry)
    for (let i = 0; i < 5; i++) await answer(user)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull()
  })

  it('starts fresh, without crashing, when the saved data is broken', () => {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, '{"locationKey": "default", ')

    renderAppAt(sessionEntry)

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.queryByText(/Welcome back!/)).not.toBeInTheDocument()
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).not.toContain(', ')
  })
})

describe('leaving an active session', () => {
  const statisticsLink = () =>
    within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
      name: 'Statistics',
    })

  it('asks first, and "Keep practicing" stays on the same question', async () => {
    const { user } = renderAppAt(sessionEntry)
    await answer(user)
    const current = heading()

    await user.click(statisticsLink())

    const dialog = screen.getByRole('alertdialog', {
      name: 'Leave this session?',
    })
    expect(dialog).toHaveTextContent('Your answer is saved')
    await user.click(
      within(dialog).getByRole('button', { name: 'Keep practicing' }),
    )

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(heading()).toBe(current)
  })

  it('"End and leave" ends the session and goes where the student chose', async () => {
    const { user } = renderAppAt(sessionEntry)
    await answer(user)

    await user.click(statisticsLink())
    await user.click(screen.getByRole('button', { name: 'End and leave' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Statistics' }),
    ).toBeInTheDocument()
    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)
    expect(stored).toMatchObject({ attempted: 1 })
    expect(stored.completedAt).toEqual(expect.any(String))
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull()
  })

  it('also asks when going back in history', async () => {
    const { user, router } = renderAppAt('/practice/setup')
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    await router.navigate(-1)

    expect(
      await screen.findByRole('alertdialog', { name: 'Leave this session?' }),
    ).toBeInTheDocument()
  })

  it('does not warn after the session is complete', async () => {
    const { user } = renderAppAt(sessionEntry)
    for (let i = 0; i < 5; i++) await answer(user)

    await user.click(statisticsLink())

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Statistics' }),
    ).toBeInTheDocument()
  })
})
