import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import FlightSearchClient from '@/app/(dashboard)/flights/FlightSearchClient'
import {
  TRAVEL_ORIGIN_EVENT,
  TRAVEL_ORIGIN_STORAGE_KEY,
  type TravelOriginPreference,
} from '@/lib/travel-origin'

const analyticsMock = vi.hoisted(() => ({
  track: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/analytics', () => analyticsMock)

function mockFlightResponse() {
  return new Response(JSON.stringify({ cards: [], message: 'No flights found' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function latestRequestBody(fetchMock: ReturnType<typeof vi.fn>) {
  const lastCall = fetchMock.mock.calls.at(-1)
  const init = lastCall?.[1] as RequestInit | undefined
  return JSON.parse(String(init?.body ?? '{}'))
}

describe('FlightSearchClient origin preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
    analyticsMock.track.mockClear()
    vi.unstubAllGlobals()
  })

  test('uses saved public travel origin for initial flight previews', async () => {
    const preference: TravelOriginPreference = {
      origin: 'Atlanta',
      savedAt: '2026-06-19T00:00:00.000Z',
    }
    window.localStorage.setItem(TRAVEL_ORIGIN_STORAGE_KEY, JSON.stringify(preference))
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(latestRequestBody(fetchMock)).toMatchObject({
      origin_city: 'Atlanta',
      destination: 'NAS',
    })
    expect(analyticsMock.track).toHaveBeenCalledWith('flight_origin_preference_applied', {
      origin: 'Atlanta',
      source: 'stored_preference',
      destination: 'NAS',
    })
    expect(screen.getByLabelText('From')).toHaveValue('Atlanta (ATL)')
    expect(screen.getByRole('button', { name: 'Atlanta to Nassau' })).toBeInTheDocument()
  })

  test('updates flight previews when the public origin prompt changes', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    act(() => {
      window.dispatchEvent(new CustomEvent(TRAVEL_ORIGIN_EVENT, {
        detail: { origin: 'Toronto' },
      }))
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(latestRequestBody(fetchMock)).toMatchObject({
      origin_city: 'Toronto',
      destination: 'NAS',
    })
    expect(analyticsMock.track).toHaveBeenCalledWith('flight_origin_preference_applied', {
      origin: 'Toronto',
      source: 'public_prompt_event',
      destination: 'NAS',
    })
    expect(screen.getByLabelText('From')).toHaveValue('Toronto (YYZ)')
    expect(screen.getByRole('button', { name: 'Toronto to Nassau' })).toBeInTheDocument()
  })
})
