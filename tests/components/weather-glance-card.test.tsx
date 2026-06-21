import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import WeatherGlanceCard from '@/components/home/WeatherGlanceCard'

function weatherResponse() {
  return new Response(JSON.stringify({
    island: 'Nassau',
    islandId: 'nassau',
    tempF: 84,
    condition: 'Partly cloudy',
    windMph: 12,
    humidity: 74,
    forecast: [
      {
        date: '2026-06-19',
        highF: 87,
        lowF: 78,
        rainChance: 25,
        condition: 'Partly cloudy',
      },
      {
        date: '2026-06-20',
        highF: 88,
        lowF: 79,
        rainChance: 30,
        condition: 'Slight rain',
      },
    ],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('WeatherGlanceCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('keeps forecast expansion disabled while weather is still loading', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(() => new Promise(() => undefined)))

    render(<WeatherGlanceCard island="Nassau" />)

    expect(screen.getByRole('button', { name: 'Checking forecast' })).toBeDisabled()
  })

  test('shows direct forecast details without routing the user to chat', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => weatherResponse()))

    const { container } = render(<WeatherGlanceCard island="Nassau" />)

    expect(await screen.findByText('84°F')).toBeInTheDocument()
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByText('Wind 12 mph · Humidity 74%')).toBeInTheDocument()
    expect(container.querySelector('a[href*="/dashboard/chat"]')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View forecast' }))

    expect(screen.getByRole('button', { name: 'Hide forecast' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Nassau forecast')).toBeInTheDocument()
    expect(screen.getByText('Fri, Jun 19')).toBeInTheDocument()
    expect(screen.getByText('87° / 78°')).toBeInTheDocument()
    expect(screen.getByText('Rain 25%')).toBeInTheDocument()
    expect(screen.getByText('Sat, Jun 20')).toBeInTheDocument()
    expect(screen.getByText('88° / 79°')).toBeInTheDocument()
  })

  test('keeps the current-condition fallback usable when forecast data is absent', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      tempF: 82,
      condition: 'Sunny',
      windMph: 8,
      forecast: [],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    render(<WeatherGlanceCard island="Exuma" />)

    expect(await screen.findByText('82°F')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'View forecast' }))

    expect(screen.getByText('Detailed forecast is not available right now. Current conditions are still shown above.')).toBeInTheDocument()
  })
})
