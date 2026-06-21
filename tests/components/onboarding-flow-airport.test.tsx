import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import OnboardingFlow from '@/components/OnboardingFlow'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      update: mocks.update,
    }),
  }),
}))

describe('OnboardingFlow home airport', () => {
  beforeEach(() => {
    mocks.push.mockClear()
    mocks.refresh.mockClear()
    mocks.update.mockReset()
    mocks.update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  test('uses airport autocomplete and saves the resolved flight code', async () => {
    render(<OnboardingFlow userId="user-123" defaultName="Valdez" />)

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Couple' }))

    const homeAirport = screen.getByRole('combobox', { name: 'Home airport' })
    expect(homeAirport).toHaveAttribute('placeholder', 'Miami, Atlanta, Toronto')
    expect(screen.queryByText(/3-letter IATA airport code/i)).not.toBeInTheDocument()

    fireEvent.change(homeAirport, { target: { value: 'west palm' } })
    expect(screen.getByText('Palm Beach International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Palm Beach International Airport/i }))

    expect(homeAirport).toHaveValue('West Palm Beach (PBI)')
    expect(document.querySelector('input[type="hidden"][name="home_airport"]')).toHaveValue('West Palm Beach')

    fireEvent.click(screen.getByRole('button', { name: "Let's go!" }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      onboarding_completed: true,
      display_name: 'Valdez',
      party_type: 'couple',
      home_airport: 'PBI',
    })
    expect(mocks.push).toHaveBeenCalledWith('/dashboard')
  })
})
