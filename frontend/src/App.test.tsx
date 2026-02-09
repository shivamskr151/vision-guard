import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './App'

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppRoutes />
    </MemoryRouter>
  )
}

describe('App', () => {
  it('renders overview at root', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: /Operational Overview/i })).toBeInTheDocument()
  })

  it('navigates to anomaly page at /anomaly', () => {
    renderApp('/anomaly')
    expect(screen.getByRole('heading', { level: 1, name: 'Anomaly Detection' })).toBeInTheDocument()
  })

  it('navigates to registry at /registry', () => {
    renderApp('/registry')
    expect(screen.getByRole('heading', { level: 1, name: 'Asset Registry' })).toBeInTheDocument()
  })

  it('navigates to inspections at /inspections', () => {
    renderApp('/inspections')
    expect(screen.getByRole('heading', { level: 1, name: /Inspection Overview/i })).toBeInTheDocument()
  })

  it('shows inspection reports at /inspections/reports', () => {
    renderApp('/inspections/reports')
    expect(screen.getByRole('heading', { level: 1, name: /Inspection Reports/i })).toBeInTheDocument()
  })

  it('shows 404 page for unknown routes', () => {
    renderApp('/unknown-page')
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Page not found/i })).toBeInTheDocument()
  })
})
