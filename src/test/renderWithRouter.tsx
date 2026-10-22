import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
} from 'react-router'
import { AppProvider } from '../app/AppProvider'
import { appRoutes } from '../app/AppRoutes'

/** Renders the full app routes starting at the given URL (and router state). */
export function renderAppAt(path: InitialEntry) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  return {
    user: userEvent.setup(),
    router,
    ...render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    ),
  }
}
