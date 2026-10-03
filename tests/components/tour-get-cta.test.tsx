import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import TourGetCta from '@/components/tours/TourGetCta'

const TOUR_ID = '24600000-0000-4000-8000-000000000201'

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string; is_anonymous?: boolean },
  entitled: false,
  source: null as string | null,
  rpc: vi.fn(),
  checkoutProps: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'is', 'limit']) chain[method] = () => chain
    chain.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: mocks.entitled ? [{ id: 'ent-1', source: mocks.source }] : [], error: null }).then(resolve)
    return {
      auth: { getUser: async () => ({ data: { user: mocks.user }, error: null }) },
      from: () => chain,
      rpc: mocks.rpc,
    }
  },
}))

vi.mock('@/lib/stripe/client', () => ({
  getStripeForPublishableKey: () => Promise.resolve(null),
}))

vi.mock('@/components/checkout/CheckoutForm', () => ({
  default: (props: { clientSecret: string; returnUrl: string; amountCents: number }) => {
    mocks.checkoutProps(props)
    return <div data-testid="payment-element">Payment element</div>
  },
}))

function renderCta(priceCents: number) {
  return render(<TourGetCta tourId={TOUR_ID} title="Nassau Heritage Walk" priceCents={priceCents} currency="USD" />)
}

beforeEach(() => {
  mocks.user = null
  mocks.entitled = false
  mocks.source = null
  mocks.rpc.mockReset()
  mocks.checkoutProps.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TourGetCta', () => {
  test('signed out shows sign in and create account links back to the tour', async () => {
    renderCta(0)
    const signIn = await screen.findByRole('link', { name: 'Sign in' })
    expect(signIn).toHaveAttribute('href', `/login?redirect=%2Ftours%2F${TOUR_ID}`)
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      `/login?mode=signup&redirect=%2Ftours%2F${TOUR_ID}`,
    )
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  test('free tour claims through claim_free_self_tour and flips to In My tours', async () => {
    mocks.user = { id: 'user-1', email: 'traveler@example.com' }
    mocks.rpc.mockResolvedValue({ data: { id: 'ent-1' }, error: null })
    renderCta(0)

    await userEvent.click(await screen.findByRole('button', { name: 'Add to my tours' }))

    expect(mocks.rpc).toHaveBeenCalledWith('claim_free_self_tour', { p_tour_id: TOUR_ID })
    expect(await screen.findByText('In My tours')).toBeInTheDocument()
    expect(screen.queryByText('Owned')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to My tours' })).toHaveAttribute('href', '/profile/tours')
  })

  test('an existing Stripe entitlement shows Purchased for a priced tour', async () => {
    mocks.user = { id: 'user-1' }
    mocks.entitled = true
    mocks.source = 'stripe'
    renderCta(499)
    expect(await screen.findByText('Purchased')).toBeInTheDocument()
    expect(screen.queryByText('Owned')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Buy/ })).not.toBeInTheDocument()
  })

  test('an existing free entitlement shows In My tours', async () => {
    mocks.user = { id: 'user-1' }
    mocks.entitled = true
    mocks.source = 'free'
    renderCta(0)
    expect(await screen.findByText('In My tours')).toBeInTheDocument()
  })

  test('guest sessions are asked to create an account', async () => {
    mocks.user = { id: 'anon-1', is_anonymous: true }
    renderCta(499)
    expect(await screen.findByText(/browsing as a guest/i)).toBeInTheDocument()
  })

  test('paid tour opens the Payment Element with the returned client secret', async () => {
    mocks.user = { id: 'user-1' }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      clientSecret: 'pi_123_secret_abc',
      publishableKey: 'pk_test_123',
      amountCents: 499,
      currency: 'usd',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderCta(499)

    await userEvent.click(await screen.findByRole('button', { name: 'Buy for $4.99' }))

    expect(fetchMock).toHaveBeenCalledWith(`/api/tours/${TOUR_ID}/checkout`, { method: 'POST' })
    expect(await screen.findByTestId('payment-element')).toBeInTheDocument()
    expect(mocks.checkoutProps).toHaveBeenCalledWith(expect.objectContaining({
      clientSecret: 'pi_123_secret_abc',
      amountCents: 499,
      returnUrl: `${window.location.origin}/tours/${TOUR_ID}/success`,
    }))
  })

  test('409 ALREADY_ENTITLED from checkout marks the tour owned', async () => {
    mocks.user = { id: 'user-1' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'owned', code: 'ALREADY_ENTITLED' }),
      { status: 409 },
    )))
    renderCta(499)

    await userEvent.click(await screen.findByRole('button', { name: 'Buy for $4.99' }))

    await waitFor(() => expect(screen.getByText('Purchased')).toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('already in your account')
  })

  test('422 FREE_ENTITLEMENT_REQUIRED switches to the free claim', async () => {
    mocks.user = { id: 'user-1' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'free', code: 'FREE_ENTITLEMENT_REQUIRED' }),
      { status: 422 },
    )))
    renderCta(499)

    await userEvent.click(await screen.findByRole('button', { name: 'Buy for $4.99' }))

    expect(await screen.findByRole('button', { name: 'Add to my tours' })).toBeInTheDocument()
  })
})
