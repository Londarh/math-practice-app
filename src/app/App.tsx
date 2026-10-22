import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProvider } from './AppProvider'
import { appRoutes } from './AppRoutes'

const router = createBrowserRouter(appRoutes)

function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  )
}

export default App
