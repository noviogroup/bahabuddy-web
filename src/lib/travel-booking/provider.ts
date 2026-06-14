export type ProviderJson = Record<string, unknown> | unknown[]

export type ProviderResult<T = ProviderJson> = {
  data: T
  status: number
}

const DEFAULT_BASE_URL = 'https://api.liteapi.travel/v3.0'

export function getTravelBookingConfig() {
  const apiKey = process.env.TRAVEL_BOOKING_API_KEY ?? process.env.LITEAPI_API_KEY ?? ''
  const baseUrl = (process.env.TRAVEL_BOOKING_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const authHeader = process.env.TRAVEL_BOOKING_API_AUTH_HEADER ?? 'X-API-Key'

  return {
    apiKey,
    baseUrl,
    authHeader,
    configured: Boolean(apiKey),
  }
}

export async function callTravelProvider<T = ProviderJson>(
  path: string,
  body: unknown,
  init?: { method?: 'GET' | 'POST'; accept?: string }
): Promise<ProviderResult<T>> {
  const config = getTravelBookingConfig()

  if (!config.configured) {
    throw new Error('Travel booking provider is not configured. Add TRAVEL_BOOKING_API_KEY to the server environment.')
  }

  const method = init?.method ?? 'POST'
  const headers: Record<string, string> = {
    Accept: init?.accept ?? 'application/json',
    'Content-Type': 'application/json',
  }

  headers[config.authHeader] = config.authHeader.toLowerCase() === 'authorization'
    ? `Bearer ${config.apiKey}`
    : config.apiKey

  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    cache: 'no-store',
  })

  const text = await response.text()
  let data: unknown = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    const message = extractProviderMessage(data) ?? `Provider request failed with status ${response.status}.`
    const error = new Error(message)
    ;(error as Error & { status?: number; details?: unknown }).status = response.status
    ;(error as Error & { status?: number; details?: unknown }).details = data
    throw error
  }

  return {
    data: data as T,
    status: response.status,
  }
}

export function getProviderErrorResponse(error: unknown) {
  const typed = error as Error & { status?: number; details?: unknown }
  return {
    error: typed.message || 'Provider request failed.',
    details: typed.details ?? null,
    status: typed.status ?? 500,
  }
}

function extractProviderMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const candidates = [record.error, record.message, record.detail, record.title]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }

  return null
}
