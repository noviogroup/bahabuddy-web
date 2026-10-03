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

describe('FlightSearchClient origin preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
    analyticsMock.track.mockClear()
    vi.unstubAllGlobals()
  })

  test('uses a saved origin without inventing travel dates or searching', async () => {
    const preference: TravelOriginPreference = {
      origin: 'Atlanta',
      savedAt: '2026-06-19T00:00:00.000Z',
    }
    window.localStorage.setItem(TRAVEL_ORIGIN_STORAGE_KEY, JSON.stringify(preference))
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    await waitFor(() => expect(screen.getByLabelText('From')).toHaveValue('Atlanta (ATL)'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Departure date' })).toHaveTextContent('Depart')
    expect(analyticsMock.track).toHaveBeenCalledWith('flight_origin_preference_applied', {
      origin: 'Atlanta',
      source: 'stored_preference',
      destination: 'NAS',
    })
    expect(screen.getByLabelText('From')).toHaveValue('Atlanta (ATL)')
    expect(screen.getByRole('button', { name: 'Atlanta to Nassau' })).toBeInTheDocument()
  })

  test('updates the origin while waiting for traveler-selected dates', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    expect(fetchMock).not.toHaveBeenCalled()
    act(() => {
      window.dispatchEvent(new CustomEvent(TRAVEL_ORIGIN_EVENT, {
        detail: { origin: 'Toronto' },
      }))
    })

    await waitFor(() => expect(screen.getByLabelText('From')).toHaveValue('Toronto (YYZ)'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(analyticsMock.track).toHaveBeenCalledWith('flight_origin_preference_applied', {
      origin: 'Toronto',
      source: 'public_prompt_event',
      destination: 'NAS',
    })
    expect(screen.getByLabelText('From')).toHaveValue('Toronto (YYZ)')
    expect(screen.getByRole('button', { name: 'Toronto to Nassau' })).toBeInTheDocument()
  })
})
