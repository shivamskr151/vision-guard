import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PlaceholderPage } from './PlaceholderPage'

describe('PlaceholderPage', () => {
  it('renders the given title', () => {
    render(<PlaceholderPage title="Coming Soon" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Coming Soon' })).toBeInTheDocument()
  })

  it('shows not implemented message', () => {
    const { container } = render(<PlaceholderPage title="Settings" />)
    expect(within(container).getByText(/not implemented yet/i)).toBeInTheDocument()
  })
})
