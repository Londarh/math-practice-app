import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAppAt } from '../test/renderWithRouter'

// The header navigation also has a "Settings" link, so query inside <main>.
function getMainLink(name: string) {
  return within(screen.getByRole('main')).getByRole('link', { name })
}

describe('HomePage', () => {
  it('shows a welcome message and the three main actions', async () => {
    await renderAppAt('/')

    expect(screen.getByText(/ready to practice/i)).toBeInTheDocument()
    expect(getMainLink('Start Practice')).toBeInTheDocument()
    expect(getMainLink('View Statistics')).toBeInTheDocument()
    expect(getMainLink('Settings')).toBeInTheDocument()
  })

  it.each([
    ['Start Practice', 'Practice Setup'],
    ['View Statistics', 'Statistics'],
    ['Settings', 'Settings'],
  ])('"%s" opens the %s page', async (button, heading) => {
    const { user } = await renderAppAt('/')

    await user.click(getMainLink(button))

    // Statistics and Settings load on demand, so wait for the page.
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it('can be operated with the keyboard', async () => {
    const { user } = await renderAppAt('/')

    await user.tab() // skip link
    await user.tab() // header brand
    for (let i = 0; i < 4; i++) await user.tab() // navigation links
    await user.tab()

    expect(getMainLink('Start Practice')).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })
})
