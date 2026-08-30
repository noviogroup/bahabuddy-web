import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import TripContextChips from '@/components/trip/TripContextChips'

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  }),
}))

const trip = {
  id: 'trip-123',
  name: 'Bahamas trip',
  islands: ['Nassau & Paradise Island'],
  date_start: null,
  date_end: null,
  party_type: 'couple',
  party_size: 2,
  budget_estimate: 3500,
}

describe('TripContextChips brand CTA states', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockResolvedValue({ data: trip })
  })

  test('uses brand-blue chips, selected states, and save actions for direct trip edits', async () => {
    render(<TripContextChips tripId="trip-123" />)

    const whoChip = await screen.findByRole('button', { name: '2 couple' })
    expect(whoChip).toHaveClass('hover:bg-brand-600')
    expect(whoChip).not.toHaveClass('hover:bg-night')

    fireEvent.click(whoChip)
    fireEvent.click(screen.getByRole('button', { name: 'Family' }))

    const family = screen.getByRole('button', { name: 'Family' })
    expect(family).toHaveClass('bg-brand-600')
    expect(family).not.toHaveClass('bg-night')

    const update = screen.getByRole('button', { name: /Update/i })
    expect(update).toHaveClass('bg-brand-600')
    expect(update).toHaveClass('hover:bg-brand-700')
    expect(update.querySelector('.bg-gold-400')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Close'))
    fireEvent.click(screen.getByRole('button', { name: '$$' }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Luxury/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Luxury/i }))
    expect(screen.getByRole('button', { name: /Luxury/i })).toHaveClass('border-brand-600')
    expect(screen.getByRole('button', { name: /Luxury/i }).querySelector('.bg-gold-400')).not.toBeInTheDocument()
  })
})
