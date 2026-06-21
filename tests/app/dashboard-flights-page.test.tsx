import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import DashboardFlightsPage, { metadata } from '@/app/(dashboard)/dashboard/flights/page'

vi.mock('@/app/(dashboard)/flights/FlightSearchClient', () => ({
  default: () => <div data-testid="dashboard-flight-marketplace">Flight marketplace search</div>,
}))

describe('DashboardFlightsPage', () => {
  test('uses the canonical marketplace flight flow instead of the provider workbench', () => {
    render(<DashboardFlightsPage />)

    expect(screen.getByText('Compare and book Bahamas flights')).toBeInTheDocument()
    expect(screen.getByText(/structured traveler, passport, payment, and confirmation flow/i)).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-flight-marketplace')).toBeInTheDocument()
    expect(screen.queryByText(/provider key stays server-side/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/prebook payload/i)).not.toBeInTheDocument()
  })

  test('describes dashboard flights as traveler booking, not an internal workbench', () => {
    expect(metadata.title).toBe('Flights | Baha Buddy Dashboard')
    expect(metadata.description).toContain('structured Baha Buddy booking flow')
    expect(metadata.description).not.toMatch(/workbench|provider payload/i)
  })
})
