import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
} from 'react-router'
import { AppProvider } from '../app/AppProvider'
import { appRoutes } from '../app/AppRoutes'

/**
 * Renders the full app routes starting at the given URL (and router state).
 * Waits until lazily loaded pages are ready, like a finished page load.
 */
export async function renderAppAt(path: InitialEntry) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  if (!router.state.initialized) {
    await new Promise<void>((resolve) => {
      const unsubscribe = router.subscribe((state) => {
        if (state.initialized) {
          unsubscribe()
          resolve()
        }
      })
    })
  }
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
