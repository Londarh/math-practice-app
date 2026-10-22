import { screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../services/storageService'
import type { PracticeConfig } from '../types/session'
import { makeAttempt, makePattern, makeSession } from './fixtures'
import { renderAppAt } from './renderWithRouter'

/**
 * Runs axe-core on the whole page. Color contrast is skipped because jsdom
 * does not compute styles; contrast.test.ts checks the color tokens instead.
 */
async function expectNoViolations() {
  const results = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false } },
  })
  const summary = results.violations.map(
    (v) =>
      `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  )
  expect(summary).toEqual([])
}

function seedHistory() {
  const attempts = [makeAttempt(), makeAttempt({ selfReportedCorrect: false })]
  localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(attempts))
  localStorage.setItem(
    STORAGE_KEYS.sessions,
    JSON.stringify([makeSession({ attempted: 2, correct: 1, incorrect: 1 })]),
  )
  localStorage.setItem(
    STORAGE_KEYS.mistakePatterns,
    JSON.stringify([
      makePattern(),
      makePattern({ mastered: true, similarCorrectCount: 3 }),
    ]),
  )
}

const config: PracticeConfig = {
  operations: ['multiplication'],
  difficulty: 2,
  sessionLength: 5,
}

describe('automated accessibility check (axe-core)', () => {
  it('really reports problems (checks the checker)', async () => {
    document.body.innerHTML = '<main><button></button><img src="x.png"></main>'

    const results = await axe.run(document.body)

    expect(results.violations.map((v) => v.id)).toEqual(
      expect.arrayContaining(['button-name', 'image-alt']),
    )
    document.body.innerHTML = ''
  })

  it.each([
    ['home', '/'],
    ['practice setup', '/practice/setup'],
    ['settings', '/settings'],
    ['empty statistics', '/statistics'],
    ['empty summary', '/practice/summary'],
    ['not found', '/no-such-page'],
  ])('%s page has no violations', async (_name, path) => {
    renderAppAt(path)
    await expectNoViolations()
  })

  it('statistics with history and mistakes has no violations', async () => {
    seedHistory()
    renderAppAt('/statistics')
    await expectNoViolations()
  })

  it('setup with mistake review available has no violations', async () => {
    seedHistory()
    renderAppAt('/practice/setup')
    await expectNoViolations()
  })

  it('the question card has no violations on either side', async () => {
    const { user } = renderAppAt({
      pathname: '/practice/session',
      state: { config },
    })
    await expectNoViolations()

    const choices = within(
      screen.getByRole('group', { name: 'Answer choices' }),
    ).getAllByRole('button')
    await user.click(choices[0])
    await expectNoViolations()

    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await expectNoViolations()
  })

  it('open confirmation dialogs have no violations', async () => {
    seedHistory()
    const { user } = renderAppAt('/statistics')
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))

    await expectNoViolations()
  })
})
