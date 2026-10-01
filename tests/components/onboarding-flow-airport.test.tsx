import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import OnboardingFlow from '@/components/OnboardingFlow'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
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
      insert: mocks.insert,
    }),
  }),
}))

describe('OnboardingFlow home airport', () => {
  beforeEach(() => {
    mocks.push.mockClear()
    mocks.refresh.mockClear()
    mocks.update.mockReset()
    mocks.insert.mockReset()
    mocks.insert.mockResolvedValue({ error: null })
    mocks.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'user-123' }], error: null }),
      }),
    })
  })

  test('uses airport autocomplete and saves the resolved flight code', async () => {
    render(<OnboardingFlow userId="user-123" defaultName="Valdez" />)

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    fireEvent.click(screen.getByRole('radio', { name: 'Couple' }))

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
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})

describe('OnboardingFlow destination and accessibility', () => {
  beforeEach(() => {
    mocks.push.mockClear()
    mocks.refresh.mockClear()
    mocks.update.mockReset()
    mocks.insert.mockReset()
    mocks.insert.mockResolvedValue({ error: null })
    mocks.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'user-123' }], error: null }),
      }),
    })
  })

  test('returns the user to the sanitised post-signup destination', async () => {
    render(<OnboardingFlow userId="user-123" defaultName="Valdez" next="/dashboard/checkout?trip_id=t1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/dashboard/checkout?trip_id=t1'))
  })

  test('never pushes an off-site destination', async () => {
    render(<OnboardingFlow userId="user-123" defaultName="Valdez" next="//evil.example/phish" />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/dashboard'))
  })

  test('creates the profile row when the update matched nothing', async () => {
    mocks.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })
    render(<OnboardingFlow userId="user-123" defaultName="" />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1))
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({
      id: 'user-123',
      display_name: 'Traveler',
      onboarding_completed: true,
    })
    expect(mocks.push).toHaveBeenCalledWith('/dashboard')
  })

  test('labels the name input, exposes selection state and announces errors', async () => {
    mocks.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: new Error('Network down') }),
      }),
    })
    render(<OnboardingFlow userId="user-123" defaultName="Maria" />)

    expect(screen.getByLabelText('Your first name')).toHaveValue('Maria')
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    const adventure = screen.getByRole('button', { name: 'Adventure' })
    expect(adventure).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(adventure)
    expect(adventure).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: /travel vibe/i })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    const couple = screen.getByRole('radio', { name: 'Couple' })
    fireEvent.click(couple)
    expect(couple).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Solo' })).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(screen.getByRole('button', { name: "Let's go!" }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
