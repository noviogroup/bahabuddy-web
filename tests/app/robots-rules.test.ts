import { describe, expect, test } from 'vitest'
import robots from '@/app/robots'

describe('robots rules', () => {
  test('blocks private routes without trailing-slash gaps and keeps place photos crawlable', () => {
    const rules = robots().rules
    const rule = Array.isArray(rules) ? rules[0] : rules
    const disallow = ([] as string[]).concat(rule.disallow ?? [])
    const allow = ([] as string[]).concat(rule.allow ?? [])

    for (const path of ['/share/', '/login', '/onboarding', '/vendor', '/checkout', '/profile', '/my-itinerary', '/dashboard', '/api/']) {
      expect(disallow).toContain(path)
    }
    // Prefix rules without a trailing slash also cover the bare path (e.g. /dashboard).
    expect(disallow).not.toContain('/dashboard/')
    expect(allow).toContain('/api/place-photo')
  })
})
