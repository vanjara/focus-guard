import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText(/Start prompting/i)).toBeInTheDocument()
  })

  it('has the correct styling classes', () => {
    render(<App />)
    const container = screen.getByText(/Start prompting/i).closest('div')
    expect(container).toHaveClass('min-h-screen', 'bg-gray-100', 'flex', 'items-center', 'justify-center')
  })
})
