export interface WeatherForecastDay {
  date: string
  highF: number | null
  lowF: number | null
  rainChance: number | null
  condition: string
}

export interface IslandWeather {
  islandId: string
  islandName: string
  tempF: number | null
  humidity: number | null
  windMph: number | null
  condition: string
  forecast: WeatherForecastDay[]
  source: 'open-meteo'
}

export interface WeatherIslandLocation {
  id: string
  name: string
  lat: number
  lng: number
}

export class WeatherProviderError extends Error {
  status: number

  constructor(message: string, status = 503) {
    super(message)
    this.name = 'WeatherProviderError'
    this.status = status
  }
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
}

export const WEATHER_ISLANDS: Record<string, WeatherIslandLocation> = {
  nassau: { id: 'nassau', name: 'Nassau', lat: 25.0343, lng: -77.3963 },
  'paradise-island': { id: 'paradise-island', name: 'Paradise Island', lat: 25.0862, lng: -77.3206 },
  exuma: { id: 'exuma', name: 'Exuma', lat: 23.6282, lng: -75.7689 },
  eleuthera: { id: 'eleuthera', name: 'Eleuthera', lat: 25.1397, lng: -76.1495 },
  'harbour-island': { id: 'harbour-island', name: 'Harbour Island', lat: 25.5014, lng: -76.6341 },
  andros: { id: 'andros', name: 'Andros', lat: 24.7083, lng: -77.7753 },
  'grand-bahama': { id: 'grand-bahama', name: 'Grand Bahama', lat: 26.6287, lng: -78.3508 },
  freeport: { id: 'grand-bahama', name: 'Grand Bahama', lat: 26.6287, lng: -78.3508 },
  bimini: { id: 'bimini', name: 'Bimini', lat: 25.7267, lng: -79.2662 },
  'long-island': { id: 'long-island', name: 'Long Island', lat: 23.15, lng: -75.0833 },
  abacos: { id: 'abacos', name: 'The Abacos', lat: 26.35, lng: -77.15 },
  'cat-island': { id: 'cat-island', name: 'Cat Island', lat: 24.314, lng: -75.547 },
  'san-salvador': { id: 'san-salvador', name: 'San Salvador', lat: 24.057, lng: -74.474 },
}

const WEATHER_ISLAND_ALIASES: Record<string, string> = {
  'new-providence': 'nassau',
  'nassau-paradise-island': 'nassau',
  'paradise-island': 'paradise-island',
  'harbour-island': 'harbour-island',
  'harbor-island': 'harbour-island',
  'grand-bahama': 'grand-bahama',
  'grand-bahama-island': 'grand-bahama',
  'the-abacos': 'abacos',
  abaco: 'abacos',
  abacos: 'abacos',
  'the-exumas': 'exuma',
  exumas: 'exuma',
}

function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function resolveWeatherIsland(
  input?: string | null,
  options: { fallbackToNassau?: boolean } = {},
): WeatherIslandLocation | null {
  const fallbackToNassau = options.fallbackToNassau ?? true
  const key = input ? normalizeKey(input) : ''
  const canonicalKey = WEATHER_ISLAND_ALIASES[key] ?? key
  const location = WEATHER_ISLANDS[canonicalKey]
  if (location) return location
  return fallbackToNassau ? WEATHER_ISLANDS.nassau : null
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function weatherCondition(code: unknown): string {
  return typeof code === 'number' ? WEATHER_CODES[code] ?? 'Unknown' : 'Unknown'
}

export async function fetchIslandWeather(
  island?: string | null,
  options: { fallbackToNassau?: boolean } = {},
): Promise<IslandWeather> {
  const location = resolveWeatherIsland(island, options)
  if (!location) {
    throw new WeatherProviderError(`Unknown island: ${island}`, 400)
  }

  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lng),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: 'America/Nassau',
    forecast_days: '7',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new WeatherProviderError('Weather service unavailable', response.status)
  }

  const data = await response.json() as {
    current?: Record<string, unknown>
    daily?: Record<string, unknown>
  }
  const daily = data.daily ?? {}
  const dates = Array.isArray(daily.time) ? daily.time : []
  const highs = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : []
  const lows = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : []
  const rainChances = Array.isArray(daily.precipitation_probability_max)
    ? daily.precipitation_probability_max
    : []
  const codes = Array.isArray(daily.weather_code) ? daily.weather_code : []

  return {
    islandId: location.id,
    islandName: location.name,
    tempF: numberOrNull(data.current?.temperature_2m),
    humidity: numberOrNull(data.current?.relative_humidity_2m),
    windMph: numberOrNull(data.current?.wind_speed_10m),
    condition: weatherCondition(data.current?.weather_code),
    forecast: dates.map((date, index) => ({
      date: String(date),
      highF: numberOrNull(highs[index]),
      lowF: numberOrNull(lows[index]),
      rainChance: numberOrNull(rainChances[index]),
      condition: weatherCondition(codes[index]),
    })),
    source: 'open-meteo',
  }
}
