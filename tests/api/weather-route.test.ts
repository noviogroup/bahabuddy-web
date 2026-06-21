import { afterEach, describe, expect, test, vi } from 'vitest'
import { GET } from '@/app/api/weather/route'

function weatherRequest(path: string): Request {
  return new Request(`http://localhost.test${path}`)
}

function openMeteoResponse() {
  return {
    current: {
      temperature_2m: 84.4,
      relative_humidity_2m: 72,
      weather_code: 2,
      wind_speed_10m: 11.5,
    },
    daily: {
      time: ['2026-06-19', '2026-06-20'],
      temperature_2m_max: [87, 88],
      temperature_2m_min: [78, 79],
      precipitation_probability_max: [25, 30],
      weather_code: [2, 61],
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/weather', () => {
  test('returns current weather and forecast for the requested Bahamas island', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(openMeteoResponse()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(weatherRequest('/api/weather?island=Exuma'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('latitude=23.6282'),
      { cache: 'no-store' },
    )
    expect(body).toMatchObject({
      island: 'Exuma',
      islandId: 'exuma',
      tempF: 84.4,
      condition: 'Partly cloudy',
      windMph: 11.5,
      humidity: 72,
      source: 'open-meteo',
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
          condition: 'Slight rain',
        },
      ],
    })
  })

  test('defaults unknown public dashboard island labels to Nassau instead of 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(openMeteoResponse()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(weatherRequest('/api/weather?island=Unknown%20Island'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('latitude=25.0343'),
      { cache: 'no-store' },
    )
    expect(body).toMatchObject({
      island: 'Nassau',
      islandId: 'nassau',
      tempF: 84.4,
    })
  })

  test('returns a provider error when Open-Meteo is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })))

    const response = await GET(weatherRequest('/api/weather?island=Nassau'))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'Weather service unavailable' })
  })
})
