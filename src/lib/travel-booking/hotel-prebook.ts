import { callTravelProvider } from '@/lib/travel-booking/provider'

export type HotelPrebookQuote = {
  prebookId: string
  offerId: string | null
  hotelId: string | null
  /** Authoritative total in minor units (cents), as priced by the provider. */
  amountCents: number
  /** Lower-case ISO currency code, e.g. 'usd'. */
  currency: string
}

/**
 * Reads a hotel prebook back from LiteAPI so the server — never the browser —
 * decides what the traveller must pay. Returns null when the provider does not
 * return a usable price.
 */
export async function getHotelPrebookQuote(prebookId: string): Promise<HotelPrebookQuote | null> {
  const result = await callTravelProvider(
    `/prebooks/${encodeURIComponent(prebookId)}`,
    undefined,
    { method: 'GET', useBookBase: true },
  )
  return parseHotelPrebookQuote(result.data, prebookId)
}

export function parseHotelPrebookQuote(payload: unknown, fallbackPrebookId = ''): HotelPrebookQuote | null {
  const root = asRecord(payload)
  const data = asRecord(root.data ?? payload)
  const amount = priceAmount(data.price) ?? priceAmount(data.totalPrice) ?? priceAmount(data.offerRetailRate)
  const currency = stringValue(data.currency)
    || stringValue(asRecord(data.price).currency)
    || stringValue(asRecord(data.totalPrice).currency)
  if (amount === null || amount <= 0 || !currency) return null

  return {
    prebookId: stringValue(data.prebookId ?? data.prebook_id) || fallbackPrebookId,
    offerId: stringValue(data.offerId) || null,
    hotelId: stringValue(data.hotelId) || null,
    amountCents: Math.round(amount * 100),
    currency: currency.toLowerCase(),
  }
}

function priceAmount(value: unknown): number | null {
  if (typeof value === 'number' || typeof value === 'string') return finite(value)
  const record = asRecord(value)
  return finite(record.amount ?? record.total ?? record.value)
}

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringValue(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}
