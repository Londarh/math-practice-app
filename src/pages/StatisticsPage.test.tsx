import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { calculateStatistics } from '../services/statisticsService'
import { STORAGE_KEYS } from '../services/storageService'
import { makeAttempt, makePattern, makeSession } from '../test/fixtures'
import { renderAppAt } from '../test/renderWithRouter'

const attempts = [
  makeAttempt({ operation: 'addition', difficulty: 1 }),
  makeAttempt({ operation: 'addition', difficulty: 1 }),
  makeAttempt({
    operation: 'division',
    difficulty: 3,
    selfReportedCorrect: false,
  }),
  makeAttempt({ operation: 'division', difficulty: 3 }),
]

function seed() {
  localStorage.setItem(
    STORAGE_KEYS.settings,
    JSON.stringify({ defaultDifficulty: 4 }),
  )
  localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(attempts))
  localStorage.setItem(
    STORAGE_KEYS.statistics,
    JSON.stringify(calculateStatistics(attempts)),
  )
  localStorage.setItem(
    STORAGE_KEYS.sessions,
    JSON.stringify([
      makeSession({
        id: 'older',
        startedAt: '2026-10-01T10:00:00.000Z',
        operations: ['addition'],
        attempted: 2,
        correct: 2,
      }),
      makeSession({
        id: 'newer',
        startedAt: '2026-10-20T10:00:00.000Z',
        operations: ['division'],
        difficulty: 3,
        attempted: 2,
        correct: 1,
        incorrect: 1,
      }),
    ]),
  )
}

function section(name: string) {
  return within(screen.getByRole('region', { name }))
}

function value(container: ReturnType<typeof section>, label: string) {
  return container.getByText(label).closest('div')!.querySelector('dd')
}

describe('StatisticsPage', () => {
  it('shows an empty state for new users', () => {
    renderAppAt('/statistics')

    expect(screen.getByText('No practice yet')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Start Practice' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reset Statistics' }),
    ).not.toBeInTheDocument()
  })

  it('shows overall totals and accuracy', () => {
    seed()
    renderAppAt('/statistics')
    const overview = section('All practice')

    expect(value(overview, 'Questions attempted')).toHaveTextContent('4')
    expect(value(overview, 'Correct answers')).toHaveTextContent('3')
    expect(value(overview, 'Incorrect answers')).toHaveTextContent('1')
    expect(value(overview, 'Accuracy')).toHaveTextContent('75%')
  })

  it('shows one card per operation and per level', () => {
    seed()
    renderAppAt('/statistics')

    const byOperation = section('By operation')
    expect(byOperation.getAllByRole('article')).toHaveLength(4)
    const division = within(
      byOperation
        .getByRole('heading', { name: /Division/ })
        .closest('article')!,
    )
    expect(value(division, 'Attempted')).toHaveTextContent('2')
    expect(value(division, 'Accuracy')).toHaveTextContent('50%')
    expect(
      within(
        byOperation
          .getByRole('heading', { name: /Multiplication/ })
          .closest('article')!,
      ).getByText('Not practiced yet'),
    ).toBeInTheDocument()

    const byLevel = section('By level')
    expect(byLevel.getAllByRole('article')).toHaveLength(4)
    expect(
      byLevel.getByRole('heading', { name: /Level 3: Intermediate/ }),
    ).toBeInTheDocument()
  })

  it('lists recent sessions from newest to oldest', () => {
    seed()
    renderAppAt('/statistics')

    const items = section('Recent sessions').getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Division')
    expect(items[0]).toHaveTextContent('Level 3: Intermediate')
    expect(items[0]).toHaveTextContent('50%')
    expect(items[0]).toHaveTextContent('Oct 20, 2026')
    expect(items[1]).toHaveTextContent('Addition')
    expect(items[1]).toHaveTextContent('100%')
  })

  it('keeps everything when the reset is cancelled', async () => {
    seed()
    const { user } = renderAppAt('/statistics')

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    const dialog = screen.getByRole('alertdialog', {
      name: 'Reset statistics?',
    })
    expect(dialog).toHaveTextContent(
      'Are you sure you want to erase all practice history and statistics?',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'No, keep it' }),
    )

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(
      value(section('All practice'), 'Questions attempted'),
    ).toHaveTextContent('4')
  })

  it('erases history after confirmation but keeps settings', async () => {
    seed()
    const { user } = renderAppAt('/statistics')

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(screen.getByRole('button', { name: 'Yes, erase it' }))

    expect(screen.getByText('No practice yet')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your practice history and statistics were erased.',
    )
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)).toEqual([])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)!)).toEqual([])
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.statistics)!).attempted,
    ).toBe(0)
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!)
        .defaultDifficulty,
    ).toBe(4)
  })

  it('does not crash on corrupted statistics and rebuilds them', () => {
    seed()
    localStorage.setItem(STORAGE_KEYS.statistics, '{"attempted": "lots"')
    renderAppAt('/statistics')

    expect(
      value(section('All practice'), 'Questions attempted'),
    ).toHaveTextContent('4')
  })
})

describe('StatisticsPage mistake review', () => {
  function seedMistakes() {
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([
        makePattern({
          incorrectCount: 3,
          similarCorrectCount: 1,
          lastIncorrectAt: '2026-10-19T10:00:00.000Z',
        }),
        makePattern({
          operation: 'division',
          firstOperand: 56,
          secondOperand: 7,
          correctAnswer: 8,
          incorrectCount: 1,
        }),
        makePattern({
          operation: 'addition',
          firstOperand: 9,
          secondOperand: 6,
          correctAnswer: 15,
          incorrectCount: 2,
          similarCorrectCount: 3,
          mastered: true,
        }),
      ]),
    )
  }

  it('shows an empty state when there are no mistakes', () => {
    seed()
    renderAppAt('/statistics')

    expect(
      section('Mistake review').getByText(/No mistakes saved yet/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Mistakes to practice' }),
    ).not.toBeInTheDocument()
  })

  it('shows mistake totals, the most missed operation and facts', () => {
    seed()
    seedMistakes()
    renderAppAt('/statistics')
    const mistakes = section('Mistake review')

    expect(value(mistakes, 'Mistakes to practice')).toHaveTextContent('2')
    expect(value(mistakes, 'Mistakes mastered')).toHaveTextContent('1')
    expect(value(mistakes, 'Similar questions practiced')).toHaveTextContent(
      '0',
    )
    expect(mistakes.getByText('Multiplication')).toBeInTheDocument()
    expect(mistakes.getByText('Missed 3 times')).toBeInTheDocument()

    const facts = mistakes.getAllByRole('listitem')
    expect(facts.map((li) => li.textContent)).toEqual([
      '8 × 7 = 56missed 3 times',
      '9 + 6 = 15missed 2 times',
      '56 ÷ 7 = 8missed 1 time',
    ])
  })

  it('lists active mistakes with progress, and mastered ones separately', async () => {
    seed()
    seedMistakes()
    const { user } = renderAppAt('/statistics')
    const details = section('Mistakes to practice')

    const active = within(
      details.getByRole('list', { name: 'Mistakes to practice' }),
    ).getAllByRole('listitem')
    expect(active).toHaveLength(2)
    expect(active[0]).toHaveTextContent('8 × 7 = 56')
    expect(active[0]).toHaveTextContent('Times missed3')
    expect(active[0]).toHaveTextContent('Oct 19, 2026')
    expect(
      within(active[0]).getByRole('progressbar', {
        name: 'Mastery progress for 8 × 7 = 56',
      }),
    ).toHaveAttribute('aria-valuetext', '1 of 3 similar questions right')

    const mastered = details.getByText('Mastered mistakes (1)')
    expect(
      details.getByRole('list', { name: 'Mastered mistakes' }),
    ).not.toBeVisible()
    await user.click(mastered)
    const masteredList = details.getByRole('list', {
      name: 'Mastered mistakes',
    })
    expect(masteredList).toBeVisible()
    expect(masteredList).toHaveTextContent('9 + 6 = 15')
    expect(masteredList).toHaveTextContent('Mastered!')
  })

  it('keeps showing saved mistakes after statistics are reset', async () => {
    seed()
    seedMistakes()
    const { user } = renderAppAt('/statistics')

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(screen.getByRole('button', { name: 'Yes, erase it' }))

    expect(screen.getByText('No practice yet')).toBeInTheDocument()
    expect(
      value(section('Mistake review'), 'Mistakes to practice'),
    ).toHaveTextContent('2')
  })
})
