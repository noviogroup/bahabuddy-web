import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import TravelOriginPrompt from '@/components/TravelOriginPrompt'
import {
  TRAVEL_ORIGIN_EVENT,
  TRAVEL_ORIGIN_STORAGE_KEY,
} from '@/lib/travel-origin'

let mockPathname = '/'
const analyticsMock = vi.hoisted(() => ({
  track: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

vi.mock('@/lib/analytics', () => analyticsMock)

describe('TravelOriginPrompt', () => {
  beforeEach(() => {
    mockPathname = '/'
    window.localStorage.clear()
    analyticsMock.track.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('prompts public visitors and saves their flight origin', () => {
    const listener = vi.fn()
    window.addEventListener(TRAVEL_ORIGIN_EVENT, listener)

    render(<TravelOriginPrompt />)

    act(() => {
      vi.advanceTimersByTime(700)
    })

    fireEvent.change(screen.getByLabelText('Travelling from'), {
      target: { value: 'Atlanta' },
    })
    const useOriginButton = screen.getByRole('button', { name: 'Use origin' })
    expect(useOriginButton).toHaveClass('bg-brand-600')
    expect(useOriginButton.querySelector('.bg-gold-400')).toBeTruthy()
    fireEvent.click(useOriginButton)

    expect(JSON.parse(window.localStorage.getItem(TRAVEL_ORIGIN_STORAGE_KEY) ?? '{}')).toMatchObject({
      origin: 'Atlanta',
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Flights will preview from Atlanta.')).toBeInTheDocument()
    expect(analyticsMock.track).toHaveBeenCalledWith('travel_origin_prompt_shown', { path: '/' })
    expect(analyticsMock.track).toHaveBeenCalledWith('travel_origin_saved', {
      path: '/',
      origin: 'Atlanta',
      source: 'public_prompt',
    })

    window.removeEventListener(TRAVEL_ORIGIN_EVENT, listener)
  })

  test('uses airport autocomplete instead of a datalist for public origin capture', () => {
    render(<TravelOriginPrompt />)

    act(() => {
      vi.advanceTimersByTime(700)
    })

    const origin = screen.getByRole('combobox', { name: 'Travelling from' })
    expect(origin).toBeInTheDocument()
    expect(document.querySelector('#travel-origin-prompt-options')).toBeNull()

    fireEvent.change(origin, {
      target: { value: 'west palm' },
    })

    expect(screen.getByText('Palm Beach International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Palm Beach International Airport/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Use origin' }))

    expect(JSON.parse(window.localStorage.getItem(TRAVEL_ORIGIN_STORAGE_KEY) ?? '{}')).toMatchObject({
      origin: 'West Palm Beach',
    })
    expect(screen.getByText('Flights will preview from West Palm Beach.')).toBeInTheDocument()
  })

  test('tracks prompt dismissal', () => {
    render(<TravelOriginPrompt />)

    act(() => {
      vi.advanceTimersByTime(700)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(analyticsMock.track).toHaveBeenCalledWith('travel_origin_prompt_shown', { path: '/' })
    expect(analyticsMock.track).toHaveBeenCalledWith('travel_origin_prompt_dismissed', { path: '/' })
  })

  test('does not show on authenticated app surfaces', () => {
    mockPathname = '/dashboard'

    render(<TravelOriginPrompt />)

    act(() => {
      vi.advanceTimersByTime(700)
    })

    expect(screen.queryByLabelText('Travel origin prompt')).not.toBeInTheDocument()
    expect(analyticsMock.track).not.toHaveBeenCalled()
  })

  test('does not show on checkout and booking mutation routes', () => {
    for (const pathname of [
      '/flights/offer-123/book',
      '/flights/offer-123/confirmation',
      '/stays/lp6558fbc7/guests',
      '/stays/lp6558fbc7/checkout',
      '/stays/lp6558fbc7/confirmation',
    ]) {
      mockPathname = pathname
      const { unmount } = render(<TravelOriginPrompt />)

      act(() => {
        vi.advanceTimersByTime(700)
      })

      expect(screen.queryByLabelText('Travel origin prompt')).not.toBeInTheDocument()
      unmount()
    }
    expect(analyticsMock.track).not.toHaveBeenCalled()
  })
})
