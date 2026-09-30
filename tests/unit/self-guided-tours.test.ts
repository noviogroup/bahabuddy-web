import { describe, expect, test, vi } from 'vitest'

import {
  checkoutErrorMessage,
  classifyCheckoutError,
  entitlementSourceLabel,
  isFreeTour,
  pollForEntitlement,
  previewStopLimit,
  previewStopName,
  previewStopSummary,
  resolveTourCta,
  tourDurationLabel,
  tourLoginHref,
  tourOwnershipLabel,
  tourPriceLabel,
  tourStopCountLabel,
} from '@/lib/self-guided-tours'

describe('tourPriceLabel', () => {
  test('0 and missing prices are Free', () => {
    expect(tourPriceLabel(0)).toBe('Free')
    expect(tourPriceLabel(null)).toBe('Free')
    expect(tourPriceLabel(-5)).toBe('Free')
    expect(isFreeTour(0)).toBe(true)
  })

  test('priced tours show dollars and cents', () => {
    expect(tourPriceLabel(499, 'USD')).toBe('$4.99')
    expect(tourPriceLabel(1200, 'usd')).toBe('$12.00')
    expect(tourPriceLabel(50)).toBe('$0.50')
    expect(isFreeTour(499)).toBe(false)
  })

  test('falls back gracefully for an unknown currency code', () => {
    expect(tourPriceLabel(250, 'NOTACODE')).toBe('2.50 NOTACODE')
  })
})

describe('catalog fact labels', () => {
  test('duration minutes', () => {
    expect(tourDurationLabel(45)).toBe('45 min')
    expect(tourDurationLabel(90)).toBe('1.5 hr')
    expect(tourDurationLabel(480)).toBe('8 hr')
    expect(tourDurationLabel(null)).toBeNull()
  })

  test('stop counts', () => {
    expect(tourStopCountLabel(1)).toBe('1 stop')
    expect(tourStopCountLabel(9)).toBe('9 stops')
    expect(tourStopCountLabel(0)).toBeNull()
  })

  test('preview stop limit defaults to 2', () => {
    expect(previewStopLimit({ preview_stop_count: null })).toBe(2)
    expect(previewStopLimit({ preview_stop_count: 0 })).toBe(0)
    expect(previewStopLimit({ preview_stop_count: 3 })).toBe(3)
  })

  test('entitlement source label', () => {
    expect(entitlementSourceLabel({ source: 'free', price_paid_cents: 0, currency: 'USD' })).toBe('Added free')
    expect(entitlementSourceLabel({ source: 'stripe', price_paid_cents: 499, currency: 'USD' })).toBe('Purchased · $4.99')
    expect(entitlementSourceLabel({ source: 'admin', price_paid_cents: 0, currency: 'USD' })).toBe('Included with your account')
  })
})

describe('resolveTourCta', () => {
  const base = { authLoading: false, signedIn: true, isAnonymous: false, owned: false, priceCents: 0 }

  test('loading while auth or ownership resolves', () => {
    expect(resolveTourCta({ ...base, authLoading: true })).toBe('loading')
    expect(resolveTourCta({ ...base, owned: null })).toBe('loading')
  })

  test('signed out asks to sign in regardless of price', () => {
    expect(resolveTourCta({ ...base, signedIn: false, owned: null })).toBe('sign_in')
    expect(resolveTourCta({ ...base, signedIn: false, owned: null, priceCents: 999 })).toBe('sign_in')
  })

  test('guest sessions must create an account', () => {
    expect(resolveTourCta({ ...base, isAnonymous: true })).toBe('account_required')
  })

  test('free vs paid', () => {
    expect(resolveTourCta(base)).toBe('claim_free')
    expect(resolveTourCta({ ...base, priceCents: 499 })).toBe('buy')
  })

  test('ownership wins over price (grandfathered tours)', () => {
    expect(resolveTourCta({ ...base, owned: true, priceCents: 499 })).toBe('owned')
    expect(resolveTourCta({ ...base, owned: true })).toBe('owned')
  })

  test('login links return to the tour', () => {
    expect(tourLoginHref('abc')).toBe('/login?redirect=%2Ftours%2Fabc')
    expect(tourLoginHref('abc', 'signup')).toBe('/login?mode=signup&redirect=%2Ftours%2Fabc')
  })
})

describe('classifyCheckoutError', () => {
  test('maps stripe-payment self_tour codes', () => {
    expect(classifyCheckoutError(409, 'ALREADY_ENTITLED')).toBe('owned')
    expect(classifyCheckoutError(422, 'FREE_ENTITLEMENT_REQUIRED')).toBe('claim_free')
    expect(classifyCheckoutError(403, 'ACCOUNT_REQUIRED')).toBe('account_required')
    expect(classifyCheckoutError(401, 'AUTH_REQUIRED')).toBe('account_required')
    expect(classifyCheckoutError(409, 'PAYMENT_IN_PROGRESS')).toBe('in_progress')
    expect(classifyCheckoutError(500, undefined)).toBe('error')
    expect(checkoutErrorMessage('error')).toMatch(/try again/i)
  })
})

describe('pollForEntitlement', () => {
  function fakeClock() {
    let t = 0
    return {
      now: () => t,
      sleep: vi.fn(async (ms: number) => {
        t += ms
      }),
    }
  }

  test('resolves granted as soon as the check passes', async () => {
    const clock = fakeClock()
    const check = vi.fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(true)
    await expect(pollForEntitlement({ check, ...clock, intervalMs: 1000 })).resolves.toBe('granted')
    expect(check).toHaveBeenCalledTimes(3)
    expect(clock.sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 1500])
  })

  test('first check runs immediately', async () => {
    const clock = fakeClock()
    const check = vi.fn().mockResolvedValue(true)
    await expect(pollForEntitlement({ check, ...clock })).resolves.toBe('granted')
    expect(clock.sleep).not.toHaveBeenCalled()
  })

  test('times out and caps the backoff at 5s', async () => {
    const clock = fakeClock()
    const check = vi.fn().mockResolvedValue(false)
    await expect(pollForEntitlement({ check, ...clock, intervalMs: 2000, timeoutMs: 20_000 })).resolves.toBe('timeout')
    const delays = clock.sleep.mock.calls.map(([ms]) => ms)
    expect(Math.max(...delays)).toBeLessThanOrEqual(5000)
    expect(clock.now()).toBeLessThanOrEqual(20_000)
  })

  test('stops when aborted', async () => {
    const controller = new AbortController()
    const clock = fakeClock()
    const check = vi.fn(async () => {
      controller.abort()
      return false
    })
    await expect(pollForEntitlement({ check, ...clock, signal: controller.signal })).resolves.toBe('aborted')
    expect(check).toHaveBeenCalledTimes(1)
  })
})

describe('tourOwnershipLabel', () => {
  test('matches the app: Purchased for Stripe, In My tours for free claims and grants', () => {
    expect(tourOwnershipLabel({ source: 'stripe', priceCents: 0 })).toBe('Purchased')
    expect(tourOwnershipLabel({ source: 'free', priceCents: 499 })).toBe('In My tours')
    expect(tourOwnershipLabel({ source: 'admin' })).toBe('In My tours')
  })

  test('unknown source falls back to the price', () => {
    expect(tourOwnershipLabel({ source: null, priceCents: 499 })).toBe('Purchased')
    expect(tourOwnershipLabel({ priceCents: 0 })).toBe('In My tours')
  })
})

describe('preview stop copy', () => {
  test('approved traveler_summary wins over the Airtable description', () => {
    expect(
      previewStopSummary({
        description: 'Long Airtable story. Second sentence.',
        traveler_summary: 'Start at Atlantis, the resort at the center of Paradise Island tourism.',
        copy_status: 'approved',
      }),
    ).toBe('Start at Atlantis, the resort at the center of Paradise Island tourism.')
  })

  test('unapproved or missing copy falls back to the first description sentence', () => {
    const description = 'Long Airtable story. Second sentence.\n\nTip: bring water.'
    expect(previewStopSummary({ description, traveler_summary: 'Draft copy.', copy_status: 'draft' })).toBe('Long Airtable story.')
    expect(previewStopSummary({ description, traveler_summary: null, copy_status: 'approved' })).toBe('Long Airtable story.')
    expect(previewStopSummary({ description: null })).toBeNull()
  })

  test('stop names drop the Airtable "<Area> Stop <n> - " prefix', () => {
    expect(previewStopName('Paradise Island Stop 1 - Atlantis Paradise Island')).toBe('Atlantis Paradise Island')
    expect(previewStopName('Georgetown Market')).toBe('Georgetown Market')
  })
})
