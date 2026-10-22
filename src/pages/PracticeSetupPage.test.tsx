import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { STORAGE_KEYS } from '../services/storageService'
import { makePattern } from '../test/fixtures'
import { PracticeSetupPage } from './PracticeSetupPage'

/** Stands in for the session page and shows the config it received. */
function SessionProbe() {
  const location = useLocation()
  return <pre data-testid="received">{JSON.stringify(location.state)}</pre>
}

function renderSetup(state?: unknown) {
  return {
    user: userEvent.setup(),
    ...render(
      <AppProvider>
        <MemoryRouter initialEntries={[{ pathname: '/practice/setup', state }]}>
          <Routes>
            <Route path="/practice/setup" element={<PracticeSetupPage />} />
            <Route path="/practice/session" element={<SessionProbe />} />
          </Routes>
        </MemoryRouter>
      </AppProvider>,
    ),
  }
}

describe('PracticeSetupPage', () => {
  it('shows all operation, difficulty and length options', () => {
    renderSetup()

    for (const name of [
      'Addition',
      'Subtraction',
      'Multiplication',
      'Division',
      'Mixed: all operations',
    ]) {
      expect(screen.getByRole('checkbox', { name })).toBeInTheDocument()
    }
    for (const name of [
      /Beginner/,
      /Easy/,
      /Intermediate/,
      /Advanced/,
      '5 questions',
      '10 questions',
      '20 questions',
      'Continuous',
    ]) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument()
    }
  })

  it('starts with sensible defaults', () => {
    renderSetup()

    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Beginner/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeEnabled()
  })

  it('allows more than one operation to be selected', async () => {
    const { user } = renderSetup()

    await user.click(screen.getByRole('checkbox', { name: 'Division' }))

    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
  })

  it('selects and clears all operations with the mixed shortcut', async () => {
    const { user } = renderSetup()
    const mixed = screen.getByRole('checkbox', {
      name: 'Mixed: all operations',
    })

    await user.click(mixed)
    expect(mixed).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Multiplication' }),
    ).toBeChecked()

    await user.click(mixed)
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
  })

  it('allows only one difficulty level', async () => {
    const { user } = renderSetup()

    await user.click(screen.getByRole('radio', { name: /Advanced/ }))

    expect(screen.getByRole('radio', { name: /Advanced/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Beginner/ })).not.toBeChecked()
  })

  it('disables Start Session and explains why when no operation is picked', async () => {
    const { user } = renderSetup()

    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))

    expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
    expect(
      screen.getByText('Pick at least one operation to start.'),
    ).toBeInTheDocument()
  })

  it('can be operated with the keyboard', async () => {
    const { user } = renderSetup()

    screen.getByRole('checkbox', { name: 'Subtraction' }).focus()
    await user.keyboard(' ')

    expect(screen.getByRole('checkbox', { name: 'Subtraction' })).toBeChecked()
  })

  it('passes the chosen configuration to the practice session', async () => {
    const { user } = renderSetup()

    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
    await user.click(screen.getByRole('checkbox', { name: 'Subtraction' }))
    await user.click(screen.getByRole('radio', { name: /Intermediate/ }))
    await user.click(screen.getByRole('radio', { name: 'Continuous' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    expect(JSON.parse(screen.getByTestId('received').textContent!)).toEqual({
      config: {
        operations: ['subtraction', 'multiplication'],
        difficulty: 3,
        sessionLength: 'continuous',
      },
    })
  })

  it('pre-fills options and shows a notice passed in router state', () => {
    renderSetup({
      config: { operations: ['division'], difficulty: 2, sessionLength: 20 },
      notice: 'Pick your options first!',
    })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Pick your options first!',
    )
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Easy/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '20 questions' })).toBeChecked()
  })

  it('pre-fills the defaults saved on the settings page', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        defaultOperations: ['subtraction', 'division'],
        defaultDifficulty: 3,
        defaultSessionLength: 'continuous',
      }),
    )
    renderSetup()

    expect(screen.getByRole('checkbox', { name: 'Subtraction' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Intermediate/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Continuous' })).toBeChecked()
  })

  it('lets saved defaults be changed for one session', async () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ defaultDifficulty: 3, defaultSessionLength: 20 }),
    )
    const { user } = renderSetup()

    await user.click(screen.getByRole('radio', { name: /Beginner/ }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    expect(
      JSON.parse(screen.getByTestId('received').textContent!).config,
    ).toMatchObject({ difficulty: 1, sessionLength: 20 })
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!),
    ).toMatchObject({ defaultDifficulty: 3 })
  })
})

describe('PracticeSetupPage review mode', () => {
  const reviewOption = () =>
    screen.getByRole('radio', { name: /Practice my mistakes/ })

  it('offers regular practice and mistake review, regular by default', () => {
    renderSetup()

    expect(
      screen.getByRole('radio', { name: 'Regular practice' }),
    ).toBeChecked()
    expect(reviewOption()).not.toBeChecked()
  })

  it('disables mistake review and explains why when there are no mistakes', () => {
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([makePattern({ mastered: true, similarCorrectCount: 3 })]),
    )
    renderSetup()

    expect(reviewOption()).toBeDisabled()
    expect(reviewOption()).toHaveAccessibleDescription(
      /you have no mistakes to practice/,
    )
  })

  it('shows how many active mistakes there are', () => {
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([
        makePattern(),
        makePattern({
          operation: 'addition',
          firstOperand: 2,
          secondOperand: 3,
          correctAnswer: 5,
        }),
        makePattern({ mastered: true, similarCorrectCount: 3 }),
      ]),
    )
    renderSetup()

    expect(reviewOption()).toBeEnabled()
    expect(reviewOption()).toHaveAccessibleName(/2 mistakes to practice/)
    expect(
      screen.getByText('You have 2 active mistakes to practice.'),
    ).toBeInTheDocument()
  })

  it('starts a review session built from the active mistakes', async () => {
    const times = makePattern({ incorrectCount: 3 })
    const plus = makePattern({
      operation: 'addition',
      firstOperand: 2,
      secondOperand: 3,
      correctAnswer: 5,
      difficulty: 1,
    })
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([plus, times]),
    )
    const { user } = renderSetup()

    await user.click(reviewOption())
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Beginner/ })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    const { config } = JSON.parse(screen.getByTestId('received').textContent!)
    expect(config.sessionLength).toBe(5)
    expect(config.operations).toEqual(['addition', 'multiplication'])
    // The more often missed fact comes first.
    expect(config.reviewPatterns.map((p: { id: string }) => p.id)).toEqual([
      times.id,
      plus.id,
    ])
  })
})
