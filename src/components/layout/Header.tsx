import { Link } from 'react-router'
import { Navigation } from './Navigation'
import './Header.css'

export function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand">
          <span className="header__logo" aria-hidden="true">
            +
          </span>
          Math Practice
        </Link>
        <Navigation />
      </div>
    </header>
  )
}
