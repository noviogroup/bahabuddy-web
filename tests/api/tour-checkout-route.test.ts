import { beforeEach, describe, expect, test, vi } from 'vitest'

const TOUR_ID = '24600000-0000-4000-8000-000000000201'

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; is_anonymous?: boolean },
  accessToken: 'user-access-token' as string | null,
  createSelfTourPaymentIntent: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: mocks.user } }),
      getSession: async () => ({ data: { session: mocks.accessToken ? { access_token: mocks.accessToken } : null } }),
    },
  }),
}))

vi.mock('@/lib/stripe/edge-function', () => ({
  createSelfTourPaymentIntent: mocks.createSelfTourPaymentIntent,
  isSelfTourPaymentIntentError: (result: object) => 'error' in result,
}))

import { POST } from '@/app/api/tours/[id]/checkout/route'

function call(id = TOUR_ID) {
  return POST(new Request(`http://localhost.test/api/tours/${id}/checkout`, { method: 'POST' }), { params: { id } })
}

beforeEach(() => {
  mocks.user = { id: 'user-1' }
  mocks.accessToken = 'user-access-token'
  mocks.createSelfTourPaymentIntent.mockReset()
})

describe('POST /api/tours/[id]/checkout', () => {
  test('rejects a non-uuid tour id', async () => {
    const response = await call('not-a-tour')
    expect(response.status).toBe(400)
    expect(mocks.createSelfTourPaymentIntent).not.toHaveBeenCalled()
  })

  test('requires a signed-in, non-guest account', async () => {
    mocks.user = null
    expect((await call()).status).toBe(401)
    mocks.user = { id: 'anon', is_anonymous: true }
    const response = await call()
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: 'ACCOUNT_REQUIRED' })
    expect(mocks.createSelfTourPaymentIntent).not.toHaveBeenCalled()
  })

  test('forwards only the tour id and the user token to stripe-payment', async () => {
    mocks.createSelfTourPaymentIntent.mockResolvedValue({
      paymentIntentClientSecret: 'pi_1_secret_x',
      paymentIntentId: 'pi_1',
      publishableKey: 'pk_test_1',
      amountCents: 499,
      currency: 'USD',
    })
    const response = await call()
    expect(mocks.createSelfTourPaymentIntent).toHaveBeenCalledWith({ tourId: TOUR_ID, accessToken: 'user-access-token' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      clientSecret: 'pi_1_secret_x',
      paymentIntentId: 'pi_1',
      publishableKey: 'pk_test_1',
      amountCents: 499,
      currency: 'USD',
    })
  })

  test('passes Edge Function status and code through', async () => {
    mocks.createSelfTourPaymentIntent.mockResolvedValue({ error: 'Already owned', status: 409, code: 'ALREADY_ENTITLED' })
    const response = await call()
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Already owned', code: 'ALREADY_ENTITLED' })
  })
})
