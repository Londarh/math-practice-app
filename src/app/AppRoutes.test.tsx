import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAppAt } from '../test/renderWithRouter'

describe('AppRoutes', () => {
  it.each([
    ['/', 'Hi there, math explorer!'],
    ['/practice/setup', 'Practice Setup'],
    // Without a chosen config, the session page sends you to setup.
    ['/practice/session', 'Practice Setup'],
    ['/practice/summary', 'Session Summary'],
    ['/statistics', 'Statistics'],
    ['/settings', 'Settings'],
  ])('renders the page for %s', (path, heading) => {
    renderAppAt(path)

    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it('shows a fallback page for unknown routes', async () => {
    const { user } = renderAppAt('/no-such-page')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Go to Home' }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Hi there, math explorer!',
      }),
    ).toBeInTheDocument()
  })

  it('marks the current page in the navigation', () => {
    renderAppAt('/statistics')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    const current = nav.querySelector('[aria-current="page"]')

    expect(current).toHaveTextContent('Statistics')
  })
})
