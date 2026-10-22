import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the application title in the header', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Math Practice')
  })
})
