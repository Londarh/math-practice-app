import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../services/defaultSettings'
import { STORAGE_KEYS } from '../services/storageService'
import { makeAttempt, makeSession } from '../test/fixtures'
import { renderAppAt } from '../test/renderWithRouter'

/** What is saved, or the defaults when nothing has been saved yet. */
const savedSettings = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? 'null') ??
  DEFAULT_SETTINGS

describe('SettingsPage', () => {
  it('shows every setting with its default value', () => {
    renderAppAt('/settings')

    expect(
      screen.getByRole('switch', { name: /Sound effects/ }),
    ).not.toBeChecked()
    expect(screen.getByRole('switch', { name: /Card animation/ })).toBeChecked()
    expect(
      screen.getByRole('switch', { name: /Show explanations/ }),
    ).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Beginner/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
    expect(
      screen.getByRole('spinbutton', { name: /needed to master a mistake/ }),
    ).toHaveValue(3)
    expect(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    ).toBeInTheDocument()
  })

  it('saves changes automatically', async () => {
    const { user } = renderAppAt('/settings')

    await user.click(screen.getByRole('switch', { name: /Sound effects/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Division' }))
    await user.click(screen.getByRole('radio', { name: /Advanced/ }))
    await user.click(screen.getByRole('radio', { name: 'Continuous' }))

    expect(savedSettings()).toMatchObject({
      soundEnabled: true,
      defaultOperations: ['addition', 'division'],
      defaultDifficulty: 4,
      defaultSessionLength: 'continuous',
    })
  })

  it('saves a new mastery threshold', async () => {
    const { user } = renderAppAt('/settings')
    const input = screen.getByRole('spinbutton', {
      name: /needed to master a mistake/,
    })

    await user.clear(input)
    await user.type(input, '5')

    expect(savedSettings().masteryThreshold).toBe(5)
  })

  it('rejects an out-of-range mastery threshold', async () => {
    const { user } = renderAppAt('/settings')
    const input = screen.getByRole('spinbutton', {
      name: /needed to master a mistake/,
    })

    await user.clear(input)
    await user.type(input, '0')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText('Please enter a whole number from 1 to 10.'),
    ).toBeInTheDocument()
    expect(savedSettings().masteryThreshold).toBe(
      DEFAULT_SETTINGS.masteryThreshold,
    )

    // Leaving the field puts the saved value back.
    await user.tab()
    expect(input).toHaveValue(DEFAULT_SETTINGS.masteryThreshold)
  })

  it('never saves an empty list of default operations', async () => {
    const { user } = renderAppAt('/settings')

    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))

    expect(screen.getByText(/Pick at least one operation/)).toBeInTheDocument()
    expect(savedSettings().defaultOperations).toEqual(['addition'])
  })

  it('uses the saved defaults on the practice setup page', async () => {
    const { user } = renderAppAt('/settings')

    await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('radio', { name: /Easy/ }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole(
        'link',
        { name: /Practice/ },
      ),
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Multiplication' }),
    ).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Easy/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: '5 questions' })).toBeChecked()
  })

  it('keeps data when clearing is cancelled', async () => {
    localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify([makeAttempt()]))
    const { user } = renderAppAt('/settings')

    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    await user.click(screen.getByRole('button', { name: 'No, keep my data' }))

    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!),
    ).toHaveLength(1)
  })

  it('clears everything, restores defaults and goes home', async () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ defaultDifficulty: 4, soundEnabled: true }),
    )
    localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify([makeAttempt()]))
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([makeSession()]))
    localStorage.setItem('someone.else', 'keep')
    const { user } = renderAppAt('/settings')

    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    const dialog = screen.getByRole('alertdialog', {
      name: 'Erase everything?',
    })
    expect(dialog).toHaveTextContent('It cannot be undone.')
    await user.click(
      within(dialog).getByRole('button', { name: 'Yes, erase everything' }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Hi there, math explorer!',
      }),
    ).toBeInTheDocument()
    expect(savedSettings()).toEqual(DEFAULT_SETTINGS)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)).toEqual([])
    expect(localStorage.getItem('someone.else')).toBe('keep')
  })
})
