export type ProviderJson = Record<string, unknown> | unknown[]

export type ProviderResult<T = ProviderJson> = {
  data: T
  status: number
}

const DEFAULT_BASE_URL = 'https://api.liteapi.travel/v3.0'
const DEFAULT_BOOK_BASE_URL = 'https://book.liteapi.travel/v3.0'

export function getTravelBookingConfig() {
  const apiKey = process.env.TRAVEL_BOOKING_API_KEY ?? process.env.LITEAPI_API_KEY ?? ''
  const baseUrl = (process.env.TRAVEL_BOOKING_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const bookBaseUrl = (process.env.TRAVEL_BOOKING_BOOK_BASE_URL ?? DEFAULT_BOOK_BASE_URL).replace(/\/$/, '')
  const authHeader = process.env.TRAVEL_BOOKING_API_AUTH_HEADER ?? 'X-API-Key'

  return {
    apiKey,
    baseUrl,
    bookBaseUrl,
    authHeader,
    configured: Boolean(apiKey),
  }
}

export async function callTravelProvider<T = ProviderJson>(
  path: string,
  body: unknown,
  init?: { method?: 'GET' | 'POST'; accept?: string; baseUrl?: string; useBookBase?: boolean }
): Promise<ProviderResult<T>> {
  const config = getTravelBookingConfig()

  if (!config.configured) {
    // Operator-facing detail stays in server logs; getProviderErrorResponse maps
    // this to traveller-safe copy.
    const error = new Error('Travel booking provider is not configured (TRAVEL_BOOKING_API_KEY missing).')
    ;(error as ProviderError).status = 503
    ;(error as ProviderError).code = 'provider_not_configured'
    throw error
  }

  const method = init?.method ?? 'POST'
  const headers: Record<string, string> = {
    Accept: init?.accept ?? 'application/json',
    'Content-Type': 'application/json',
  }

  headers[config.authHeader] = config.authHeader.toLowerCase() === 'authorization'
    ? `Bearer ${config.apiKey}`
    : config.apiKey

  const baseUrl = init?.baseUrl?.replace(/\/$/, '') ?? (init?.useBookBase ? config.bookBaseUrl : config.baseUrl)

  const response = await fetch(`${baseUrl}${path}`, {
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
    ;(error as ProviderError).status = response.status
    ;(error as ProviderError).details = data
    throw error
  }

  return {
    data: data as T,
    status: response.status,
  }
}

type ProviderError = Error & { status?: number; details?: unknown; code?: string }

export const PROVIDER_UNAVAILABLE_MESSAGE =
  "We can't reach our travel partner right now. Please try again in a few minutes."
export const PROVIDER_REJECTED_MESSAGE =
  'Our travel partner could not complete this request. The price or availability may have changed. Please search again or pick another option.'

/**
 * Maps a provider/config failure to a traveller-safe response. Raw provider
 * messages, payloads, and configuration hints are logged server-side only and
 * are never returned to the browser.
 */
export function getProviderErrorResponse(error: unknown) {
  const typed = (error ?? {}) as ProviderError
  const rawStatus = typeof typed.status === 'number' ? typed.status : 500
  console.error('[travel-provider]', {
    status: rawStatus,
    code: typed.code ?? null,
    message: typed.message ?? String(error),
    details: typed.details ?? null,
  })

  // 401/403 from the provider mean our credentials are wrong, not the traveller's input.
  const unavailable = typed.code === 'provider_not_configured' || rawStatus >= 500 || rawStatus === 401 || rawStatus === 403
  return {
    error: unavailable ? PROVIDER_UNAVAILABLE_MESSAGE : PROVIDER_REJECTED_MESSAGE,
    details: null,
    status: unavailable ? (typed.code === 'provider_not_configured' ? 503 : 502) : rawStatus,
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
