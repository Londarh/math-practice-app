import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ACTIVE_SESSION_KEY } from '../services/activeSessionStorage'
import {
  questionKey,
  similarCandidates,
} from '../services/similarQuestionGenerator'
import { STORAGE_KEYS } from '../services/storageService'
import type { MistakePattern } from '../types/mistake'
import type { Question } from '../types/question'
import { renderAppAt } from './renderWithRouter'

const h1 = (name: string) => screen.getByRole('heading', { level: 1, name })
const problem = () => screen.getByRole('heading', { level: 2 }).textContent!

async function answer(user: UserEvent, correct: boolean) {
  const choices = within(screen.getByRole('group', { name: 'Answer choices' }))
  await user.click(choices.getAllByRole('button')[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: correct ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

function region(name: string) {
  return within(screen.getByRole('region', { name }))
}

function value(container: ReturnType<typeof region>, label: string) {
  return container.getByText(label).closest('div')!.querySelector('dd')
}

const stored = <T,>(key: string): T =>
  JSON.parse(localStorage.getItem(key) ?? 'null')

describe('integration: a wrong answer becomes mistake review', () => {
  it('start → answer wrong → stats update → mistake stored → similar question', async () => {
    // 1. Start a practice session.
    const { user } = await renderAppAt('/practice/setup')
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
    await user.click(screen.getByRole('radio', { name: /Easy/ }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(h1('Practice')).toBeInTheDocument()

    // 2–4. Select an answer, flip the card and mark it incorrect.
    const missed = problem()
    await answer(user, false)
    for (let i = 0; i < 4; i++) await answer(user, true)
    expect(h1('Session Summary')).toBeInTheDocument()

    // 5. Statistics update.
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await screen.findByRole('heading', { level: 1, name: 'Statistics' })
    const overall = region('All practice')
    expect(value(overall, 'Questions attempted')).toHaveTextContent('5')
    expect(value(overall, 'Correct answers')).toHaveTextContent('4')
    expect(value(overall, 'Incorrect answers')).toHaveTextContent('1')
    const multiplication = within(
      region('By operation')
        .getByRole('heading', { name: /Multiplication/ })
        .closest('article')!,
    )
    expect(value(multiplication, 'Incorrect')).toHaveTextContent('1')

    // 6. The mistake pattern is stored, and listed on the statistics page.
    const [pattern] = stored<MistakePattern[]>(STORAGE_KEYS.mistakePatterns)
    expect(stored<MistakePattern[]>(STORAGE_KEYS.mistakePatterns)).toHaveLength(
      1,
    )
    expect(pattern).toMatchObject({
      operation: 'multiplication',
      difficulty: 2,
      incorrectCount: 1,
      mastered: false,
    })
    expect(missed).toBe(
      `${pattern.firstOperand} × ${pattern.secondOperand} = ?`,
    )
    expect(
      region('Mistakes to practice').getByRole('listitem'),
    ).toHaveTextContent(
      `${pattern.firstOperand} × ${pattern.secondOperand} = ${pattern.correctAnswer}`,
    )

    // 7. Start mistake-review mode.
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole(
        'link',
        { name: 'Practice' },
      ),
    )
    await user.click(
      screen.getByRole('radio', { name: /Practice my mistakes/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(h1('Practice Mistakes')).toBeInTheDocument()

    // 8. A similar question appears: related to the mistake, but not a copy.
    const { state } = JSON.parse(sessionStorage.getItem(ACTIVE_SESSION_KEY)!)
    const question: Question = state.currentQuestion
    expect(question).toMatchObject({
      source: 'mistake-review',
      mistakePatternId: pattern.id,
    })
    expect(problem()).toBe(question.displayText)
    expect(problem()).not.toBe(missed)
    const similar = similarCandidates(pattern).map((c) =>
      questionKey(c.operation, c.firstOperand, c.secondOperand),
    )
    expect(similar).toContain(
      questionKey(
        question.operation,
        question.firstOperand,
        question.secondOperand,
      ),
    )
  })
})

describe('integration: other sessions', () => {
  it('a mixed-operation session practices several operations', async () => {
    const { user } = await renderAppAt('/practice/setup')
    await user.click(
      screen.getByRole('checkbox', { name: 'Mixed: all operations' }),
    )
    await user.click(screen.getByRole('radio', { name: '20 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    for (let i = 0; i < 20; i++) await answer(user, true)

    expect(h1('Session Summary')).toBeInTheDocument()
    const operations = new Set(
      stored<{ operation: string }[]>(STORAGE_KEYS.attempts).map(
        (a) => a.operation,
      ),
    )
    expect(operations.size).toBeGreaterThan(1)
    expect(
      screen.getByText('Operations practiced').closest('div'),
    ).toHaveTextContent('Addition, Subtraction, Multiplication, Division')
  })

  it('a whole session can be completed with the keyboard only', async () => {
    const { user } = await renderAppAt('/practice/setup')

    /** Presses Tab until the given control has focus. */
    async function tabTo(target: HTMLElement) {
      for (let i = 0; i < 60 && document.activeElement !== target; i++) {
        await user.tab()
      }
      expect(target).toHaveFocus()
    }
    const button = (name: string) => screen.getByRole('button', { name })

    // Tab enters a radio group at its checked option; arrows move within it.
    await tabTo(screen.getByRole('radio', { name: '10 questions' }))
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: '5 questions' })).toBeChecked()
    await tabTo(button('Start Session'))
    await user.keyboard('{Enter}')
    expect(h1('Practice')).toBeInTheDocument()

    for (let i = 0; i < 5; i++) {
      await user.keyboard(String((i % 4) + 1))
      await tabTo(button('Flip Card'))
      await user.keyboard('{Enter}')
      await tabTo(button('I Got It Right'))
      await user.keyboard(' ')
    }

    expect(h1('Session Summary')).toBeInTheDocument()
    expect(stored<unknown[]>(STORAGE_KEYS.attempts)).toHaveLength(5)
  })
})
