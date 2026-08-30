import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ConciergeTripPlanPage from '@/app/concierge-trip-plan/page'
import ConciergeCheckoutPage from '@/app/concierge-trip-plan/checkout/page'
import ConciergeSuccessPage from '@/app/concierge-trip-plan/success/page'
import ConciergeOrderPage from '@/app/(dashboard)/dashboard/concierge/[orderId]/page'
import PaymentsPage from '@/app/(dashboard)/dashboard/payments/page'
import ReceiptPage from '@/app/(dashboard)/dashboard/receipts/[orderId]/page'
import ConciergeInterestForm from '@/components/revenue/ConciergeInterestForm'
import ConciergeRevenueBand from '@/components/revenue/ConciergeRevenueBand'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/ChatWidget', () => ({
  default: () => null,
}))

vi.mock('@/components/revenue/TravelDocumentLeadForm', () => ({
  default: () => <form data-testid="travel-document-lead-form" />,
}))

class MockConciergeOrderQuery {
  constructor(private readonly payload: Record<string, unknown> | Array<Record<string, unknown>>) {}

  select = vi.fn(() => this)
  eq = vi.fn(() => this)
  order = vi.fn(() => this)
  maybeSingle = vi.fn(async () => ({
    data: Array.isArray(this.payload) ? this.payload[0] : this.payload,
    error: null,
  }))

  then<TResult1 = { data: typeof this.payload; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: typeof this.payload; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: this.payload, error: null }).then(onfulfilled, onrejected)
  }
}

function expectDirectTripLink(href: string | null, expectedSource: string) {
  const url = new URL(href ?? '', 'https://bahabuddy.test')
  expect(url.pathname).toBe('/dashboard/trips/new')
  expect(url.searchParams.get('returnTo')).toMatch(/^\/concierge-trip-plan|^\/dashboard\/concierge\//)
  expect(url.searchParams.get('source')).toBe(expectedSource)
  expect(url.searchParams.get('seed')).toContain('Concierge')
}

function expectNoOldConciergeChrome(container: HTMLElement) {
  expect(container.innerHTML).not.toMatch(/bg-gradient-brand|border-sand|bg-sand|ring-sand|bg-offwhite|shadow-card/)
  expect(container.innerHTML).not.toMatch(/border-gold|ring-gold/)
}

describe('concierge direct actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('public Concierge page creates a trip first instead of opening chat', () => {
    const { container } = render(<ConciergeTripPlanPage />)

    const header = screen.getByRole('heading', { name: 'Turn a rough Bahamas idea into a trip you can actually book.' }).closest('section')
    expect(header).toHaveClass('border-gray-200')
    expect(header).not.toHaveClass('min-h-[88vh]')
    expect(screen.getByRole('link', { name: 'Start Concierge Trip Plan' })).toHaveAttribute(
      'href',
      '/concierge-trip-plan/checkout?offer=concierge_trip_plan&source=header_cta',
    )
    expect(screen.getByRole('link', { name: 'See service flow' })).toHaveAttribute('href', '#service-flow')

    const createTrip = screen.getByRole('link', { name: 'Create trip first' })
    expectDirectTripLink(createTrip.getAttribute('href'), 'concierge_bottom_cta')
    expect(container.innerHTML).not.toContain('/dashboard/chat?intent=concierge')
    expect(container.innerHTML).not.toMatch(/min-h-\[88vh\]|bg-gradient-brand|border-sand|bg-sand|ring-sand|border-gold|ring-gold/)
  })

  test('fallback Concierge success page sends users to dashboard instead of chat', () => {
    const { container } = render(
      <ConciergeSuccessPage searchParams={{ session_id: 'cs_test_123', offer: 'concierge_trip_plan' }} />,
    )

    expect(screen.getByRole('heading', { name: 'Your Concierge Trip Plan payment was successful.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Concierge' })).toHaveAttribute('href', '/concierge-trip-plan')
    expect(screen.getByRole('link', { name: 'Open dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.queryByRole('link', { name: 'Continue planning with Buddy' })).not.toBeInTheDocument()
    expect(container.innerHTML).not.toContain('/dashboard/chat?intent=concierge')
    expectNoOldConciergeChrome(container)
  })

  test('Concierge checkout uses compact neutral commerce layout', async () => {
    supabaseMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'traveler@example.com' } } })),
      },
      from: vi.fn(() => new MockConciergeOrderQuery({
        display_name: 'Valdez Williams',
        onboarding_completed: true,
      })),
    })

    const page = await ConciergeCheckoutPage({
      searchParams: { offer: 'concierge_trip_plan', source: 'header_cta' },
    })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Confirm your Concierge Trip Plan' })).toBeInTheDocument()
    expect(screen.getByText('Valdez Williams')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue to Stripe — $149' })).toBeInTheDocument()
    expect(container.querySelector('form[action="/api/concierge-checkout"]')).toBeInTheDocument()
    expect(container.querySelector('input[name="offer_id"]')).toHaveAttribute('value', 'concierge_trip_plan')
    expect(container.querySelector('input[name="source"]')).toHaveAttribute('value', 'header_cta')
    expect(screen.getAllByRole('link', { name: 'Change offer' })[0]).toHaveAttribute('href', '/concierge-trip-plan')
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/dashboard')
    expectNoOldConciergeChrome(container)
  })

  test('Concierge revenue band keeps trip creation as the secondary direct route', () => {
    const { container } = render(<ConciergeRevenueBand />)

    expect(screen.getByRole('link', { name: 'View Concierge Trip Plan' })).toHaveAttribute(
      'href',
      '/concierge-trip-plan',
    )
    const createTrip = screen.getByRole('link', { name: 'Create trip first' })
    expectDirectTripLink(createTrip.getAttribute('href'), 'concierge')
    expect(container.innerHTML).not.toContain('/dashboard/chat')
    expectNoOldConciergeChrome(container)
  })

  test('Concierge interest form keeps neutral marketplace styling', () => {
    const { container } = render(<ConciergeInterestForm />)

    expect(screen.getByRole('heading', { name: 'Send your trip for review' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeRequired()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByRole('button', { name: 'Submit concierge request' })).toHaveClass('bg-brand-600')
    expectNoOldConciergeChrome(container)
  })

  test('dashboard Concierge order links to details and related trip creation, not chat', async () => {
    supabaseMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'traveler@example.com' } } })),
      },
      from: vi.fn(() => new MockConciergeOrderQuery({
        id: 'order-1',
        user_id: 'user-1',
        offer_type: 'concierge_trip_plan',
        status: 'checkout_started',
        payment_status: 'paid',
        price_usd: 149,
        travel_dates: null,
        party_size: null,
        budget_range: null,
        destination_interests: null,
        notes: null,
        delivered_plan_url: null,
        final_itinerary: null,
      })),
    })

    const page = await ConciergeOrderPage({ params: { orderId: 'order-1' }, searchParams: {} })
    const { container } = render(page)

    expect(screen.getByRole('link', { name: 'Submit trip details' })).toHaveAttribute(
      'href',
      '/dashboard/concierge/order-1/details',
    )

    const createTrip = screen.getByRole('link', { name: 'Create related trip' })
    const url = new URL(createTrip.getAttribute('href') ?? '', 'https://bahabuddy.test')
    expect(url.pathname).toBe('/dashboard/trips/new')
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/concierge/order-1')
    expect(url.searchParams.get('source')).toBe('concierge_order')
    expect(url.searchParams.get('seed')).toContain('concierge trip plan')
    expect(screen.getByRole('link', { name: 'Submit trip details' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Submit trip details' }).querySelector('.bg-gold-400')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continue planning with Buddy' })).not.toBeInTheDocument()
    expect(container.innerHTML).not.toContain('/dashboard/chat?intent=concierge')
    expect(container.innerHTML).not.toMatch(/bg-night|hover:bg-gray-900/)
  })

  test('dashboard payments and receipts use royal-blue primary actions', async () => {
    const order = {
      id: 'order-1',
      user_id: 'user-1',
      offer_type: 'concierge_trip_plan',
      status: 'checkout_started',
      payment_status: 'paid',
      price_usd: 149,
      source: 'concierge_page',
      stripe_checkout_session_id: 'cs_test_123',
      stripe_payment_intent_id: 'pi_test_123',
      traveler_name: 'Valdez Williams',
      traveler_email: 'valdez@example.com',
      created_at: '2026-06-20T12:00:00Z',
      updated_at: '2026-06-20T12:00:00Z',
    }

    supabaseMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'traveler@example.com' } } })),
      },
      from: vi.fn(() => new MockConciergeOrderQuery([order])),
    })

    const payments = await PaymentsPage()
    const paymentView = render(payments)

    expect(screen.getByRole('link', { name: 'Receipt' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Receipt' }).querySelector('.bg-gold-400')).not.toBeInTheDocument()
    expect(paymentView.container.innerHTML).not.toMatch(/bg-night|hover:bg-gray-900/)

    paymentView.unmount()

    supabaseMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'traveler@example.com' } } })),
      },
      from: vi.fn(() => new MockConciergeOrderQuery(order)),
    })

    const receipt = await ReceiptPage({ params: { orderId: 'order-1' } })
    const receiptView = render(receipt)

    expect(screen.getByRole('link', { name: 'View order' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'View order' }).querySelector('.bg-gold-400')).not.toBeInTheDocument()
    expect(receiptView.container.innerHTML).not.toMatch(/bg-night|hover:bg-gray-900/)
  })
})
