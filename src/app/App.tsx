import { BrowserRouter } from 'react-router'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
