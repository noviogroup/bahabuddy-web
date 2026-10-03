import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  callTravelProvider: vi.fn(),
  createPaymentIntent: vi.fn(),
  getHotelPrebookQuote: vi.fn(),
  sendTransactionalEmail: vi.fn(async () => undefined),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/travel-booking/provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/travel-booking/provider')>()),
  callTravelProvider: mocks.callTravelProvider,
}))
vi.mock('@/lib/travel-booking/hotel-prebook', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/travel-booking/hotel-prebook')>()),
  getHotelPrebookQuote: mocks.getHotelPrebookQuote,
}))
vi.mock('@/lib/stripe/edge-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/stripe/edge-function')>()),
  createPaymentIntent: mocks.createPaymentIntent,
}))
vi.mock('@/lib/transactional-email', () => ({
  adminOrderLabel: (id: string) => id,
  getAdminEmailList: () => ['ops@example.com'],
  sendTransactionalEmail: mocks.sendTransactionalEmail,
}))

import { POST as createIntent } from '@/app/api/booking/payments/intent/route'
import { POST as flightPrebook } from '@/app/api/booking/flights/prebook/route'
import { POST as hotelBookingLookup } from '@/app/api/booking/hotels/booking/route'
import { PATCH as updateOrderDetails } from '@/app/api/concierge-order-details/route'
import { getConciergeOffer } from '@/lib/stripe/concierge-offers'
import { getProviderErrorResponse } from '@/lib/travel-booking/provider'
import { parseHotelPrebookQuote } from '@/lib/travel-booking/hotel-prebook'

type JsonRecord = Record<string, unknown>

function jsonRequest(body: JsonRecord, method = 'POST'): Request {
  return new Request('http://localhost.test/api', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Chainable Supabase query stub that records calls and resolves to `result`. */
function query(result: { data: unknown; error?: unknown }, calls: Array<[string, unknown[]]> = []) {
  const q: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'order', 'update', 'insert', 'limit']) {
    q[method] = vi.fn((...args: unknown[]) => {
      calls.push([method, args])
      return q
    })
  }
  q.maybeSingle = vi.fn(async () => ({ data: result.data, error: result.error ?? null }))
  q.single = vi.fn(async () => ({ data: result.data, error: result.error ?? null }))
  q.then = (resolve: (value: unknown) => unknown) => resolve({ data: result.data, error: result.error ?? null })
  return q
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('POST /api/booking/payments/intent', () => {
  function signedIn(trip: unknown = { id: 'trip-1' }) {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
        getSession: vi.fn(async () => ({ data: { session: { access_token: 'token-1' } } })),
      },
      from: vi.fn(() => query({ data: trip })),
    })
  }

  test('requires sign-in', async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    })
    const response = await createIntent(jsonRequest({ tripId: 'trip-1', prebookId: 'prebook-1' }))
    expect(response.status).toBe(401)
  })

  test("returns 404 for another user's trip", async () => {
    signedIn(null)
    const response = await createIntent(jsonRequest({ tripId: 'trip-x', prebookId: 'prebook-1' }))
    expect(response.status).toBe(404)
    expect(mocks.createPaymentIntent).not.toHaveBeenCalled()
  })

  test('requires a prebook id', async () => {
    signedIn()
    const response = await createIntent(jsonRequest({ tripId: 'trip-1', amount: 126000 }))
    expect(response.status).toBe(400)
    expect(mocks.createPaymentIntent).not.toHaveBeenCalled()
  })

  test('prices the PaymentIntent from the provider prebook, not the request body', async () => {
    signedIn()
    mocks.getHotelPrebookQuote.mockResolvedValue({
      prebookId: 'prebook-1', offerId: 'rate-1', hotelId: 'hotel-1', amountCents: 126000, currency: 'usd',
    })
    mocks.createPaymentIntent.mockResolvedValue({
      paymentIntentClientSecret: 'pi_1_secret_abc',
      paymentIntentId: 'pi_1',
      bookingAttemptId: 'attempt-1',
    })

    const response = await createIntent(jsonRequest({
      tripId: 'trip-1',
      prebookId: 'prebook-1',
      amount: 50,
      currency: 'eur',
      metadata: { hotel_id: 'hotel-1', user_id: 'attacker', trip_id: 'other-trip', liteapi_prebook_id: 'spoofed' },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.getHotelPrebookQuote).toHaveBeenCalledWith('prebook-1')
    const input = mocks.createPaymentIntent.mock.calls[0][0]
    expect(input).toMatchObject({ amount: 126000, currency: 'usd', tripId: 'trip-1', bookingType: 'hotel' })
    expect(input.metadata).toEqual({ hotel_id: 'hotel-1', source_surface: 'web', liteapi_prebook_id: 'prebook-1' })
    expect(body).toMatchObject({ paymentIntentId: 'pi_1', bookingAttemptId: 'attempt-1', amountCents: 126000, currency: 'USD' })
  })

  test('refuses to create a payment when the prebook price cannot be confirmed', async () => {
    signedIn()
    mocks.getHotelPrebookQuote.mockResolvedValue(null)
    const response = await createIntent(jsonRequest({ tripId: 'trip-1', prebookId: 'prebook-1' }))
    expect(response.status).toBe(409)
    expect(mocks.createPaymentIntent).not.toHaveBeenCalled()
  })
})

describe('POST /api/booking/flights/prebook', () => {
  test('forwards only allowlisted fields and always forces the payment SDK', async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
    })
    mocks.callTravelProvider.mockResolvedValue({ status: 200, data: { data: { prebookId: 'fp-1' } } })

    await flightPrebook(jsonRequest({
      offerId: 'offer-1',
      usePaymentSdk: false,
      margin: 99,
      contact: { firstName: 'Ada', email: 'ada@example.com', evil: 'x' },
      passengers: [{ firstName: 'Ada', lastName: 'L', documentNumber: 'P1', extra: { nested: true } }],
    }))

    expect(mocks.callTravelProvider).toHaveBeenCalledWith('/flights/prebooks', {
      offerId: 'offer-1',
      usePaymentSdk: true,
      contact: { firstName: 'Ada', email: 'ada@example.com' },
      passengers: [{ firstName: 'Ada', lastName: 'L', documentNumber: 'P1' }],
    })
  })
})

describe('POST /api/booking/hotels/booking', () => {
  test("does not reveal a provider booking that is not the user's", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
      from: vi.fn(() => query({ data: null })),
    })
    const response = await hotelBookingLookup(jsonRequest({ bookingId: 'someone-elses' }))
    expect(response.status).toBe(404)
    expect(mocks.callTravelProvider).not.toHaveBeenCalled()
  })

  test('reads owned bookings from the LiteAPI book host and returns a shaped subset', async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
      from: vi.fn(() => query({ data: { id: 'row-1' } })),
    })
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: { data: { bookingId: 'lb-1', status: 'CONFIRMED', holder: { email: 'pii@example.com' }, supplierNet: 1 } },
    })
    const response = await hotelBookingLookup(jsonRequest({ bookingId: 'lb-1' }))
    const body = await response.json()
    expect(mocks.callTravelProvider).toHaveBeenCalledWith('/bookings/lb-1', undefined, { method: 'GET', useBookBase: true })
    expect(body).toMatchObject({ bookingId: 'lb-1', status: 'CONFIRMED' })
    expect(JSON.stringify(body)).not.toContain('pii@example.com')
    expect(body).not.toHaveProperty('supplierNet')
  })
})

describe('PATCH /api/concierge-order-details', () => {
  function client(order: JsonRecord | null, calls: Array<[string, unknown[]]>) {
    let n = 0
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
      from: vi.fn(() => (n++ === 0 ? query({ data: order }) : query({ data: { id: 'order-1' } }, calls))),
    })
  }

  test('ignores payment and status fields sent by the customer', async () => {
    const calls: Array<[string, unknown[]]> = []
    client({ id: 'order-1', status: 'checkout_started', payment_status: 'unpaid' }, calls)

    const response = await updateOrderDetails(jsonRequest({
      order_id: 'order-1',
      notes: 'Honeymoon',
      payment_status: 'paid',
      status: 'paid',
      price_usd: 0.01,
      stripe_payment_intent_id: 'pi_fake',
      mark_details_submitted: true,
    }, 'PATCH'))
    const body = await response.json()

    const update = calls.find(([method]) => method === 'update')?.[1][0] as JsonRecord
    expect(update).toMatchObject({ notes: 'Honeymoon' })
    expect(Object.keys(update).sort()).toEqual(['notes', 'updated_at'])
    expect(body).toMatchObject({ inReview: false, awaitingPayment: true })
    expect(mocks.sendTransactionalEmail).not.toHaveBeenCalled()
  })

  test('moves a paid order into review and notifies admins', async () => {
    const calls: Array<[string, unknown[]]> = []
    client({ id: 'order-1', status: 'paid', payment_status: 'paid' }, calls)

    const response = await updateOrderDetails(jsonRequest({ order_id: 'order-1', mark_details_submitted: true }, 'PATCH'))
    const body = await response.json()

    const update = calls.find(([method]) => method === 'update')?.[1][0] as JsonRecord
    expect(update.status).toBe('in_review')
    expect(calls).toEqual(expect.arrayContaining([['eq', ['payment_status', 'paid']]]))
    expect(body.inReview).toBe(true)
  })
})

describe('concierge webhook', () => {
  const SECRET = 'whsec_test_secret'

  function signedRequest(event: JsonRecord) {
    const payload = JSON.stringify(event)
    const t = Math.floor(Date.now() / 1000)
    const sig = crypto.createHmac('sha256', SECRET).update(`${t}.${payload}`).digest('hex')
    return new Request('http://localhost.test/api/stripe/concierge-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': `t=${t},v1=${sig}` },
      body: payload,
    })
  }

  function sessionEvent(type: string, session: JsonRecord, id = 'evt_1') {
    return {
      id,
      type,
      data: {
        object: {
          id: 'cs_1',
          payment_intent: 'pi_c1',
          amount_total: 14900,
          payment_status: 'paid',
          customer_details: { email: 'stripe@example.com', name: 'Stripe Name' },
          metadata: { product: 'concierge_trip_plan', offer_id: 'concierge_trip_plan', order_id: 'order-1', user_id: 'user-1' },
          ...session,
        },
      },
    }
  }

  async function loadWebhook(tables: Record<string, (calls: Array<[string, unknown[]]>) => unknown>) {
    vi.resetModules()
    vi.stubEnv('STRIPE_CONCIERGE_WEBHOOK_SECRET', SECRET)
    const calls: Record<string, Array<Array<[string, unknown[]]>>> = {}
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        const tableCalls: Array<[string, unknown[]]> = []
        ;(calls[table] ??= []).push(tableCalls)
        return tables[table](tableCalls)
      }),
    })
    const mod = await import('@/app/api/stripe/concierge-webhook/route')
    return { POST: mod.POST, calls }
  }

  function updatesFor(calls: Array<Array<[string, unknown[]]>>) {
    return calls
      .filter((c) => c.some(([m]) => m === 'update'))
      .map((c) => ({ row: c.find(([m]) => m === 'update')?.[1][0] as JsonRecord, filters: c.filter(([m]) => m === 'eq' || m === 'in').map(([m, a]) => [m, ...a]) }))
  }

  test('updates the account order by metadata.order_id with forward-only status (no upsert)', async () => {
    let orderQueries = 0
    const { POST, calls } = await loadWebhook({
      stripe_webhook_events: (c) => query({ data: null }, c),
      concierge_orders: (c) => (orderQueries++ === 0
        ? query({ data: { id: 'order-1', traveler_email: 'me@example.com', traveler_name: 'Customer Name' } }, c)
        : query({ data: null }, c)),
    })

    const response = await POST(signedRequest(sessionEvent('checkout.session.completed', {})))
    expect(response.status).toBe(200)

    const updates = updatesFor(calls.concierge_orders)
    expect(updates[0].row).toMatchObject({ stripe_checkout_session_id: 'cs_1', stripe_payment_intent_id: 'pi_c1', price_usd: 149 })
    expect(updates[0].row).not.toHaveProperty('traveler_email')
    expect(updates[0].row).not.toHaveProperty('traveler_name')
    expect(updates[0].row).not.toHaveProperty('notes')
    expect(updates[0].row).not.toHaveProperty('status')
    expect(updates[1]).toMatchObject({ row: { payment_status: 'paid' }, filters: [['eq', 'id', 'order-1'], ['in', 'payment_status', ['unpaid', 'pending', 'failed']]] })
    expect(updates[2]).toMatchObject({ row: { status: 'paid' }, filters: [['eq', 'id', 'order-1'], ['in', 'status', ['checkout_started', 'pending', 'payment_failed']]] })
    expect(calls.concierge_orders.flat().some(([m]) => m === 'upsert')).toBe(false)
    const recorded = calls.stripe_webhook_events.flat().find(([m]) => m === 'insert')?.[1][0] as JsonRecord
    expect(recorded).toMatchObject({ stripe_event_id: 'evt_1', processed_for: 'concierge-webhook' })
  })

  test('skips an already-processed event', async () => {
    const { POST, calls } = await loadWebhook({
      stripe_webhook_events: (c) => query({ data: { id: 'seen' } }, c),
      concierge_orders: (c) => query({ data: null }, c),
    })
    const response = await POST(signedRequest(sessionEvent('checkout.session.completed', {})))
    expect(await response.json()).toMatchObject({ duplicate: true })
    expect(calls.concierge_orders).toBeUndefined()
  })

  test('records a 100%-off promotion as $0 and handles async payment success', async () => {
    let orderQueries = 0
    const { POST, calls } = await loadWebhook({
      stripe_webhook_events: (c) => query({ data: null }, c),
      concierge_orders: (c) => (orderQueries++ === 0 ? query({ data: { id: 'order-1' } }, c) : query({ data: null }, c)),
    })
    const response = await POST(signedRequest(sessionEvent('checkout.session.async_payment_succeeded', {
      amount_total: 0,
      payment_status: 'no_payment_required',
    })))
    expect(response.status).toBe(200)
    const updates = updatesFor(calls.concierge_orders)
    expect(updates[0].row.price_usd).toBe(0)
    expect(updates.some((u) => u.row.status === 'paid')).toBe(true)
  })

  test('creates a guest order with the Stripe customer details when no order row exists', async () => {
    const { POST, calls } = await loadWebhook({
      stripe_webhook_events: (c) => query({ data: null }, c),
      concierge_orders: (c) => query({ data: null }, c),
    })
    await POST(signedRequest(sessionEvent('checkout.session.completed', {
      metadata: { product: 'concierge_trip_plan', offer_id: 'quick_review' },
      amount_total: 4900,
    })))
    const inserted = calls.concierge_orders.flat().find(([m]) => m === 'insert')?.[1][0] as JsonRecord
    expect(inserted).toMatchObject({
      user_id: null,
      offer_type: 'quick_review',
      price_usd: 49,
      status: 'paid',
      payment_status: 'paid',
      stripe_checkout_session_id: 'cs_1',
      traveler_email: 'stripe@example.com',
    })
  })

  test('async payment failure only downgrades unsettled orders', async () => {
    let orderQueries = 0
    const { POST, calls } = await loadWebhook({
      stripe_webhook_events: (c) => query({ data: null }, c),
      concierge_orders: (c) => (orderQueries++ === 0 ? query({ data: { id: 'order-1' } }, c) : query({ data: null }, c)),
    })
    await POST(signedRequest(sessionEvent('checkout.session.async_payment_failed', { payment_status: 'unpaid' })))
    const updates = updatesFor(calls.concierge_orders)
    expect(updates[0]).toMatchObject({
      row: { status: 'payment_failed', payment_status: 'failed' },
      filters: [['eq', 'id', 'order-1'], ['in', 'payment_status', ['unpaid', 'pending']]],
    })
  })
})

describe('shared payment helpers', () => {
  test('concierge offer lookup ignores Object prototype keys', () => {
    expect(getConciergeOffer('constructor')).toBeNull()
    expect(getConciergeOffer('toString')).toBeNull()
    expect(getConciergeOffer('quick_review')?.amountCents).toBe(4900)
  })

  test('provider errors never expose raw provider text or configuration hints', () => {
    const notConfigured = Object.assign(new Error('Travel booking provider is not configured (TRAVEL_BOOKING_API_KEY missing).'), {
      status: 503,
      code: 'provider_not_configured',
    })
    const upstream = Object.assign(new Error('Supplier XYZ internal failure'), { status: 500, details: { supplier: 'XYZ' } })
    const rejected = Object.assign(new Error('offerId abc expired at supplier'), { status: 400, details: { raw: true } })

    for (const error of [notConfigured, upstream, rejected]) {
      const response = getProviderErrorResponse(error)
      expect(response.error).not.toMatch(/TRAVEL_BOOKING_API_KEY|Supplier XYZ|offerId abc/)
      expect(response.details).toBeNull()
    }
    expect(getProviderErrorResponse(notConfigured).status).toBe(503)
    expect(getProviderErrorResponse(upstream).status).toBe(502)
    expect(getProviderErrorResponse(rejected).status).toBe(400)
  })

  test('parses the authoritative prebook total in cents', () => {
    expect(parseHotelPrebookQuote({ data: { prebookId: 'p1', price: 1260.5, currency: 'USD' } })).toMatchObject({
      prebookId: 'p1',
      amountCents: 126050,
      currency: 'usd',
    })
    expect(parseHotelPrebookQuote({ data: { prebookId: 'p1', currency: 'USD' } })).toBeNull()
  })
})
