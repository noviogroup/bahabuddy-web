import { NextResponse } from 'next/server'
import { fetchIslandWeather, WeatherProviderError } from '@/lib/weather'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const island = new URL(request.url).searchParams.get('island')

  try {
    const weather = await fetchIslandWeather(island, { fallbackToNassau: true })
    return NextResponse.json({
      island: weather.islandName,
      islandId: weather.islandId,
      tempF: weather.tempF,
      condition: weather.condition,
      windMph: weather.windMph,
      humidity: weather.humidity,
      forecast: weather.forecast,
      source: weather.source,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    })
  } catch (error) {
    const status = error instanceof WeatherProviderError ? error.status : 503
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Weather service unavailable',
    }, { status })
  }
}
