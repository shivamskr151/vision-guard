import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { KPICard } from './KPICard'
import type { KPICardData } from '@/types'

describe('KPICard', () => {
  const defaultCard: KPICardData = {
    id: 'test',
    variant: 'assets',
    title: 'Total Assets',
    value: '42',
    description: 'Across all facilities',
  }

  it('renders title, value and description', () => {
    render(<KPICard {...defaultCard} />)
    expect(screen.getByText('Total Assets')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Across all facilities')).toBeInTheDocument()
  })

  it('renders trend when provided', () => {
    render(<KPICard {...defaultCard} trend={{ value: '↑ 5%', positive: true }} />)
    expect(screen.getByText('↑ 5%')).toBeInTheDocument()
  })

  it('has accessible structure with article and value', () => {
    const { container } = render(<KPICard {...defaultCard} />)
    const article = within(container).getByRole('article')
    expect(article).toHaveAttribute('aria-labelledby', 'kpi-assets-value')
    expect(within(container).getByText('42')).toBeInTheDocument()
  })
})
