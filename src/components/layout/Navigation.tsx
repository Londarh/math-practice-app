import { NavLink } from 'react-router'
import './Navigation.css'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/practice/setup', label: 'Practice', end: false },
  { to: '/statistics', label: 'Statistics', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export function Navigation() {
  return (
    <nav className="navigation" aria-label="Main">
      <ul className="navigation__list">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.end} className="navigation__link">
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
