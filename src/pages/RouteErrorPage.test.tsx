import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { appRoutes } from '../app/AppRoutes'
import { RouteErrorPage } from './RouteErrorPage'

function Broken(): never {
  throw new Error('TypeError: cannot read properties of undefined (secret)')
}

describe('RouteErrorPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a friendly message and a safe way home, without technical details', async () => {
    // React reports the thrown error to the console; keep test output quiet.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const router = createMemoryRouter(
      [
        { path: '/', element: <h1>Home page</h1> },
        {
          path: '/broken',
          element: <Broken />,
          errorElement: <RouteErrorPage />,
        },
      ],
      { initialEntries: ['/broken'] },
    )
    render(<RouterProvider router={router} />)

    expect(
      screen.getByRole('heading', { name: 'Oops! Something went wrong.' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/your saved progress is safe/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Try Again' }),
    ).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('secret')
    expect(document.body).not.toHaveTextContent('TypeError')

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Go to Home' }))
    expect(
      screen.getByRole('heading', { name: 'Home page' }),
    ).toBeInTheDocument()
  })

  it('is set up for every page, inside the layout', () => {
    const [layout] = appRoutes
    const [pages] = layout.children!

    expect(layout.errorElement).toBeDefined()
    expect(pages.errorElement).toBeDefined()
    expect(pages.children!.length).toBeGreaterThanOrEqual(7)
  })
})
