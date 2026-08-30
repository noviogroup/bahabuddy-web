import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import FareExpiryCountdown, {
  fareExpiryState,
} from '@/components/flights/FareExpiryCountdown'

describe('FareExpiryCountdown', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('formats active, long, expired, and invalid fare expirations', () => {
    const now = Date.parse('2026-08-02T18:00:00Z')

    expect(fareExpiryState('2026-08-02T18:12:34Z', now).label).toBe('Fare expires in 12:34')
    expect(fareExpiryState('2026-08-02T20:01:02Z', now).label).toBe('Fare expires in 2:01:02')
    expect(fareExpiryState('2026-08-02T18:00:00Z', now).label).toBe('Fare expired')
    expect(fareExpiryState('not-a-timestamp', now).label).toBe('Check fare availability')
  })

  test('updates every second and changes to expired at zero', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-02T18:00:00Z'))

    render(<FareExpiryCountdown expiration="2026-08-02T18:00:02Z" />)
    expect(screen.getByRole('timer')).toHaveTextContent('Fare expires in 00:02')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole('timer')).toHaveTextContent('Fare expires in 00:01')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole('timer')).toHaveTextContent('Fare expired')
    expect(screen.getByRole('timer')).toHaveClass('bg-coral-50')
  })
})
