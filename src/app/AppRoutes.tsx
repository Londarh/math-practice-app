import type { RouteObject } from 'react-router'
import { Layout } from '../components/layout/Layout'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PracticePage } from '../pages/PracticePage'
import { PracticeSetupPage } from '../pages/PracticeSetupPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { SessionSummaryPage } from '../pages/SessionSummaryPage'
import { SettingsPage } from '../pages/SettingsPage'
import { StatisticsPage } from '../pages/StatisticsPage'

/**
 * The app's routes. Used with a data router (createBrowserRouter in the app,
 * createMemoryRouter in tests), which the practice page needs to ask before
 * the student leaves an active session.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <Layout />,
    // Used only if the layout itself fails.
    errorElement: <RouteErrorPage />,
    children: [
      {
        // A page that crashes shows a friendly message inside the layout,
        // so the header and its Home link stay available.
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'practice/setup', element: <PracticeSetupPage /> },
          { path: 'practice/session', element: <PracticePage /> },
          { path: 'practice/summary', element: <SessionSummaryPage /> },
          { path: 'statistics', element: <StatisticsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
