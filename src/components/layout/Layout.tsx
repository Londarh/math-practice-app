import { Outlet } from 'react-router'
import { Header } from './Header'
import './Layout.css'

export function Layout() {
  return (
    <div className="layout">
      <a className="layout__skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="layout__main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
