import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import TourPurchaseStatus from '@/components/tours/TourPurchaseStatus'

const TOUR_ID = '24600000-0000-4000-8000-000000000201'

const mocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'traveler@example.com' } as null | { id: string; email?: string },
  results: [] as boolean[],
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'is', 'limit']) chain[method] = () => chain
    chain.then = (resolve: (value: unknown) => unknown) => {
      const granted = mocks.results.length > 1 ? mocks.results.shift() : mocks.results[0]
      return Promise.resolve({ data: granted ? [{ id: 'ent' }] : [], error: null }).then(resolve)
    }
    return {
      auth: { getUser: async () => ({ data: { user: mocks.user } }) },
      from: () => chain,
    }
  },
}))

vi.mock('@/components/StoreBadgeLinks', () => ({ default: () => <div>Store badges</div> }))

beforeEach(() => {
  mocks.user = { id: 'user-1', email: 'traveler@example.com' }
  mocks.results = [true]
})

describe('TourPurchaseStatus', () => {
  test('shows the granted tour with app instructions for the same email', async () => {
    render(<TourPurchaseStatus tourId={TOUR_ID} tourTitle="Exuma Cays Drive" redirectStatus="succeeded" />)
    expect(await screen.findByRole('heading', { name: 'Exuma Cays Drive is yours' })).toBeInTheDocument()
    expect(screen.getByText('traveler@example.com')).toBeInTheDocument()
    expect(screen.getByText(/must match this account/)).toBeInTheDocument()
  })

  test('a failed Stripe redirect never polls and offers a retry', () => {
    render(<TourPurchaseStatus tourId={TOUR_ID} tourTitle="Exuma Cays Drive" redirectStatus="requires_payment_method" />)
    expect(screen.getByRole('heading', { name: 'Payment did not go through' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the tour' })).toHaveAttribute('href', `/tours/${TOUR_ID}`)
  })

  test('signed out asks to sign in and return here', async () => {
    mocks.user = null
    render(<TourPurchaseStatus tourId={TOUR_ID} tourTitle="Exuma Cays Drive" redirectStatus="succeeded" />)
    expect(await screen.findByRole('heading', { name: 'Sign in to see your tour' })).toBeInTheDocument()
  })
})
