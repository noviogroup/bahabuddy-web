import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type JsonRecord = Record<string, unknown>

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const prebookId = String(body.prebookId ?? '')

    if (!prebookId) {
      return NextResponse.json({ error: 'prebookId is required.' }, { status: 400 })
    }

    const result = await callTravelProvider('/flights/bookings', body)
    await saveBookingRecord(result.data)

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json(
      { error: response.error, details: response.details },
      { status: response.status }
    )
  }
}

async function saveBookingRecord(payload: unknown) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminClient()

    if (!admin) return

    await admin
      .from('travel_booking_records')
      .insert({
        user_id: user?.id ?? null,
        product_type: 'flight',
        status: 'confirmed',
        provider_booking_id: findFirstString(payload, ['bookingId', 'id']),
        provider_booking_ref: findFirstString(payload, ['bookingRef', 'reference', 'pnr']),
        source: 'web',
        provider_payload: asJsonObject(payload),
      })
  } catch {
    // Booking confirmation should not fail only because local persistence failed.
  }
}

function asJsonObject(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : { data: value }
}

function findFirstString(data: unknown, keys: string[]): string | null {
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findFirstString(item, keys)
      if (result) return result
    }
    return null
  }

  const record = data as JsonRecord
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }

  for (const value of Object.values(record)) {
    const result = findFirstString(value, keys)
    if (result) return result
  }

  return null
}
