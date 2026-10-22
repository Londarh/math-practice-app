import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, type InitialEntry } from 'react-router'
import { AppRoutes } from '../app/AppRoutes'

/** Renders the full app routes starting at the given URL (and router state). */
export function renderAppAt(path: InitialEntry) {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    ),
  }
}
