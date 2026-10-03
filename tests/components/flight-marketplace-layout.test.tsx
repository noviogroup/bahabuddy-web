import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import FlightSearchClient from '@/app/(dashboard)/flights/FlightSearchClient'

const analyticsMock = vi.hoisted(() => ({
  track: vi.fn(),
}))

const navigation = vi.hoisted(() => ({ query: '' }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.query),
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
    navigation.query = 'origin=Miami&destination=NAS&depart=2099-10-17&tripType=one_way&passengers=1&cabin=economy'
    window.localStorage.clear()
    analyticsMock.track.mockClear()
    vi.unstubAllGlobals()
  })

  test('keeps confirmed search compact and preserves travelers when editing', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<FlightSearchClient />)

    await screen.findByText('No flights found')
    expect(screen.getByRole('heading', { name: 'Find flights' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Flight search' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Flight promotions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Popular flight routes' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit search' }))
    const searchForm = screen.getByRole('form', { name: 'Flight search' })
    expect(searchForm).toBeVisible()
    expect(searchForm).not.toHaveClass('bg-night')
    expect(screen.getByRole('radio', { name: 'One-way' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: 'Search', exact: true })).toHaveClass('bg-brand-600')
    expect(container.innerHTML).not.toContain('background-image')
    expect(screen.getByRole('button', { name: 'Edit travelers and cabin' })).toHaveTextContent('1 traveler, Economy')

    fireEvent.click(screen.getByRole('button', { name: 'Edit travelers and cabin' }))
    expect(screen.getByRole('dialog', { name: 'Choose travelers and cabin' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Travelers menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: '2 travelers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Cabin menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: 'Business' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Edit search' }))

    const from = screen.getByRole('combobox', { name: 'From' })
    fireEvent.change(from, { target: { value: 'west palm' } })
    expect(screen.getByText('Palm Beach International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Palm Beach International Airport/i }))

    const to = screen.getByRole('combobox', { name: 'To' })
    fireEvent.change(to, { target: { value: 'exuma' } })
    expect(screen.getByText('Exuma International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Exuma International Airport/i }))

    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(latestRequestBody(fetchMock)).toMatchObject({
      origin_city: 'West Palm Beach',
      destination: 'EXU',
    })
    expect(document.querySelector('select#destination')).toBeNull()
  })

  test('redirects hidden trip detail select focus into the custom menu', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    await screen.findByText('No flights found')
    fireEvent.click(screen.getByRole('button', { name: 'Edit search' }))

    fireEvent.click(screen.getByRole('button', { name: 'Edit travelers and cabin' }))

    const nativeTravelerSelect = document.querySelector('select#passengers-search-select')
    expect(nativeTravelerSelect).toHaveClass('sr-only')

    fireEvent.focus(nativeTravelerSelect as HTMLSelectElement)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('Choose Travelers')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open Travelers menu' })).toHaveFocus()
    })
  })

  test('lets the traveler type and use a custom departure city when no airport option matches', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightSearchClient />)

    await screen.findByText('No flights found')
    fireEvent.click(screen.getByRole('button', { name: 'Edit search' }))

    const from = screen.getByLabelText('From')
    fireEvent.change(from, { target: { value: 'Greenville' } })
    expect(screen.getByRole('option', { name: /Use "Greenville" as departure city/i })).toBeInTheDocument()
    fireEvent.keyDown(from, { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(latestRequestBody(fetchMock)).toMatchObject({
      origin_city: 'Greenville',
      destination: 'NAS',
    })
  })
  test('fresh visits wait for a chosen origin and dates', () => {
    navigation.query = ''
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<FlightSearchClient />)
    expect(screen.getByLabelText('From')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Departure date' })).toHaveTextContent('Depart')
    expect(screen.getByRole('button', { name: 'Return date' })).toHaveTextContent('Return')
    fireEvent.click(screen.getByRole('button', { name: 'Miami to Nassau' }))
    expect(screen.getByLabelText('From')).toHaveValue('Miami (MIA)')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('loading remains about the submitted trip, then empty results offer editing', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
    render(<FlightSearchClient />)
    expect(await screen.findByText(/Fetching live fare options/)).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Flight search' })).not.toBeInTheDocument()
    expect(screen.queryByText('Route preview')).not.toBeInTheDocument()
    await act(async () => finish(mockFlightResponse()))
    await screen.findByText('No flights found')
    fireEvent.click(screen.getByRole('button', { name: 'Change dates or route' }))
    expect(screen.getByLabelText('From')).toHaveValue('Miami (MIA)')
    expect(screen.getByRole('button', { name: 'Departure date' })).toHaveTextContent('Oct 17')
  })

  test('provider failure keeps inputs available for a successful retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Fares temporarily unavailable' }), { status: 503 }))
      .mockResolvedValueOnce(mockFlightResponse())
    vi.stubGlobal('fetch', fetchMock)
    render(<FlightSearchClient />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Fares temporarily unavailable')
    expect(screen.getByLabelText('From')).toHaveValue('Miami (MIA)')
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }))
    await screen.findByText('No flights found')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('filter recovery and draft edits retain the confirmed result context', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ cards: [{
      card_type: 'flight', airline: 'Test airline', route: 'MIA to NAS', stops: '1 stop',
      price: 200, currency: 'USD', passengers: 1, departure: '9:00 AM', arrival: '1:00 PM', duration: '4h', offer_id: 'test-only',
    }] }))))
    render(<FlightSearchClient />)
    await screen.findByRole('heading', { name: '1 flight' })
    fireEvent.click(screen.getByRole('button', { name: 'Nonstop (0)' }))
    expect(screen.getByText('No nonstop fares in this result set.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show all flights' }))
    expect(screen.getByRole('link', { name: 'Book this fare' })).toHaveAttribute('href', expect.stringContaining('/flights/test-only/book'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit search' }))
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'Toronto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close search' }))
    expect(screen.getByText('Miami to Nassau')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit search' }))
    expect(screen.getByLabelText('From')).toHaveValue('Toronto (YYZ)')
  })

})
