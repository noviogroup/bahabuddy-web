import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import FlightSearchClient from '@/app/(dashboard)/flights/FlightSearchClient'

const analyticsMock = vi.hoisted(() => ({
  track: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('destination=NAS&tripType=one_way&passengers=1&cabin=economy'),
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

describe('FlightSearchClient marketplace layout', () => {
  beforeEach(() => {
    analyticsMock.track.mockClear()
    vi.unstubAllGlobals()
  })

  test('renders inline search with sidebar filters that drive the live search request', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<FlightSearchClient />)

    await screen.findByText('No flights found')
    expect(screen.getByRole('form', { name: 'Flight search' })).toBeInTheDocument()
    expect(screen.getByText('Inline flight search')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Flight filters' })).toBeInTheDocument()
    const promotions = screen.getByRole('complementary', { name: 'Flight promotions' })
    expect(promotions).toBeInTheDocument()
    expect(screen.getByText('Filter flights')).toBeInTheDocument()
    expect(screen.getByText('Promo space')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'One-way' })).not.toHaveClass('bg-brand-600')
    expect(screen.getByRole('button', { name: /Search/ })).toHaveClass('bg-brand-600')
    expect(promotions.querySelector('section')).not.toHaveClass('bg-night')
    expect(screen.getByRole('link', { name: 'See concierge options' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'See concierge options' })).toHaveAttribute('href', '/concierge-trip-plan')
    expect(container.innerHTML).toMatch(/text-brand-700/)
    expect(container.innerHTML).toMatch(/bg-gold-400/)
    expect(container.innerHTML).not.toMatch(/border-gold|border-sand|bg-sand|ring-sand/)
    expect(screen.getByRole('link', { name: 'View current deals' })).toHaveAttribute('href', '/deals')
    expect(screen.getByRole('link', { name: 'Browse stays' })).toHaveAttribute('href', '/stays?sort=stars')
    expect(screen.getByRole('button', { name: 'Miami to Nassau' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Traveler count menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: '2 travelers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Cabin class menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: 'Business' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(latestRequestBody(fetchMock)).toMatchObject({
      destination: 'NAS',
      passengers: 2,
      cabin_class: 'business',
    })
    expect(window.location.pathname).toBe('/flights')
    expect(window.location.search).toContain('passengers=2')
    expect(window.location.search).toContain('cabin=business')
  })

  test('searches origin and destination with airport autocomplete instead of native airport selects', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    await screen.findByText('No flights found')

    const from = screen.getByRole('combobox', { name: 'From' })
    fireEvent.change(from, { target: { value: 'west palm' } })
    expect(screen.getByText('Palm Beach International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Palm Beach International Airport/i }))

    const to = screen.getByRole('combobox', { name: 'To' })
    fireEvent.change(to, { target: { value: 'exuma' } })
    expect(screen.getByText('Exuma International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Exuma International Airport/i }))

    fireEvent.click(screen.getByRole('button', { name: /Search/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(latestRequestBody(fetchMock)).toMatchObject({
      origin_city: 'West Palm Beach',
      destination: 'EXU',
    })
    expect(document.querySelector('select#destination')).toBeNull()
  })

  test('redirects hidden filter select focus into the custom menu', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    await screen.findByText('No flights found')

    const nativeTravelerSelect = document.querySelector('select#passengers-filter')
    expect(nativeTravelerSelect).toHaveClass('sr-only')

    fireEvent.focus(nativeTravelerSelect as HTMLSelectElement)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('Choose Traveler count')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open Traveler count menu' })).toHaveFocus()
    })
  })

  test('lets the traveler type and use a custom departure city when no airport option matches', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    await screen.findByText('No flights found')

    const from = screen.getByLabelText('From')
    fireEvent.change(from, { target: { value: 'Greenville' } })
    expect(screen.getByRole('option', { name: /Use "Greenville" as departure city/i })).toBeInTheDocument()
    fireEvent.keyDown(from, { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: /Search/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(latestRequestBody(fetchMock)).toMatchObject({
      origin_city: 'Greenville',
      destination: 'NAS',
    })
  })
})
