import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type EnvCheck = {
  key: string
  scope: 'public' | 'server'
  present: boolean
  mode?: string
  valid?: boolean
}

type SchemaCheck = {
  relation: string
  purpose: string
  columns: string[]
}

const SCHEMA_CHECKS: SchemaCheck[] = [
  {
    relation: 'bookings',
    purpose: 'canonical traveler/admin booking source',
    columns: [
      'id',
      'user_id',
      'trip_id',
      'booking_type',
      'type',
      'provider',
      'booking_ref',
      'booking_reference',
      'external_reference',
      'status',
      'amount',
      'amount_cents',
      'gross_booking_value',
      'currency',
      'supplier_ref',
      'stripe_payment_intent_id',
      'financial_metadata',
      'raw_response',
      'created_at',
      'updated_at',
    ],
  },
  {
    relation: 'trip_accommodations',
    purpose: 'canonical hotel/stay trip items',
    columns: [
      'id',
      'trip_id',
      'place_id',
      'name',
      'island',
      'check_in',
      'check_out',
      'booking_reference',
      'liteapi_hotel_id',
      'liteapi_rate_id',
      'liteapi_prebook_id',
      'stripe_payment_intent_id',
      'status',
      'total_price',
      'currency',
      'nights',
      'photo_url',
      'address',
      'description',
      'property_type',
      'gallery_images',
      'amenities',
    ],
  },
  {
    relation: 'trip_flights',
    purpose: 'canonical flight trip items',
    columns: [
      'id',
      'trip_id',
      'origin',
      'destination',
      'departure_at',
      'arrival_at',
      'airline',
      'booking_reference',
      'price',
      'provider_offer_id',
      'stripe_payment_intent_id',
      'created_at',
      'updated_at',
    ],
  },
  {
    relation: 'travel_booking_records',
    purpose: 'provider audit trail only',
    columns: [
      'id',
      'user_id',
      'product_type',
      'status',
      'provider_booking_id',
      'provider_booking_ref',
      'source',
      'origin',
      'destination',
      'start_date',
      'end_date',
      'currency',
      'amount',
      'provider_payload',
      'created_at',
      'updated_at',
    ],
  },
]

export async function GET(request: Request) {
  const readinessSecret = process.env.BOOKING_READINESS_TOKEN || process.env.INTERNAL_API_SECRET || ''
  if (!readinessSecret) {
    return NextResponse.json(
      {
        ready: false,
        error: 'booking_readiness_token_not_configured',
        message: 'Set BOOKING_READINESS_TOKEN or INTERNAL_API_SECRET on the deployed web runtime.',
      },
      { status: 503, headers: noStoreHeaders() },
    )
  }

  const token = bearerToken(request) || request.headers.get('x-baha-readiness-token') || ''
  if (token !== readinessSecret) {
    return NextResponse.json(
      { ready: false, error: 'not_authorized' },
      { status: 401, headers: noStoreHeaders() },
    )
  }

  const env = envChecks()
  const schema = await schemaChecks()
  const ready = env.every((check) => check.present && check.valid !== false) && schema.every((check) => check.ok)

  return NextResponse.json(
    {
      ready,
      checkedAt: new Date().toISOString(),
      provider: 'liteapi',
      payment: 'stripe_edge_function',
      sourceModel: {
        operational: ['bookings', 'trip_accommodations', 'trip_flights'],
        auditOnly: ['travel_booking_records'],
      },
      env,
      schema,
    },
    { status: ready ? 200 : 500, headers: noStoreHeaders() },
  )
}

function envChecks(): EnvCheck[] {
  const bookingBaseUrl = stripTrailingSlash(process.env.TRAVEL_BOOKING_BOOK_BASE_URL || 'https://book.liteapi.travel/v3.0')
  const rateBaseUrl = stripTrailingSlash(process.env.TRAVEL_BOOKING_API_BASE_URL || 'https://api.liteapi.travel/v3.0')
  const liteApiKey = process.env.TRAVEL_BOOKING_API_KEY || process.env.LITEAPI_API_KEY || ''

  return [
    publicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    publicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    publicEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', stripeMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)),
    serverEnv('SUPABASE_SERVICE_ROLE_KEY'),
    serverEnv('LiteAPI private key', liteApiKeyMode(liteApiKey), Boolean(liteApiKey)),
    {
      key: 'TRAVEL_BOOKING_API_BASE_URL',
      scope: 'server',
      present: Boolean(rateBaseUrl),
      valid: rateBaseUrl === 'https://api.liteapi.travel/v3.0',
    },
    {
      key: 'TRAVEL_BOOKING_BOOK_BASE_URL',
      scope: 'server',
      present: Boolean(bookingBaseUrl),
      valid: bookingBaseUrl === 'https://book.liteapi.travel/v3.0',
    },
  ]
}

function publicEnv(key: string, mode?: string): EnvCheck {
  return {
    key,
    scope: 'public',
    present: Boolean(process.env[key]),
    ...(mode ? { mode } : {}),
  }
}

function serverEnv(key: string, mode?: string, present = Boolean(process.env[key])): EnvCheck {
  return {
    key,
    scope: 'server',
    present,
    ...(mode ? { mode } : {}),
  }
}

async function schemaChecks() {
  const supabaseUrl = stripTrailingSlash(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    return SCHEMA_CHECKS.map((check) => ({
      relation: check.relation,
      purpose: check.purpose,
      ok: false,
      status: 0,
      detail: 'Supabase URL or service role key is missing.',
    }))
  }

  const results = []
  for (const check of SCHEMA_CHECKS) {
    const url = new URL(`/rest/v1/${check.relation}`, supabaseUrl)
    url.searchParams.set('select', check.columns.join(','))
    url.searchParams.set('limit', '0')

    try {
      const response = await fetch(url, {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: 'no-store',
      })
      const detail = response.ok ? 'OK' : await safeResponseMessage(response)
      results.push({
        relation: check.relation,
        purpose: check.purpose,
        ok: response.ok,
        status: response.status,
        columns: check.columns,
        detail,
      })
    } catch (error) {
      results.push({
        relation: check.relation,
        purpose: check.purpose,
        ok: false,
        status: 0,
        columns: check.columns,
        detail: error instanceof Error ? error.message : 'Schema check failed.',
      })
    }
  }

  return results
}

async function safeResponseMessage(response: Response) {
  const text = await response.text().catch(() => '')
  if (!text) return `HTTP ${response.status}`
  try {
    const json = JSON.parse(text) as { message?: unknown; code?: unknown }
    return [json.code, json.message].filter(Boolean).join(': ') || `HTTP ${response.status}`
  } catch {
    return text.slice(0, 240)
  }
}

function bearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function stripeMode(value: string | undefined) {
  if (!value) return undefined
  if (value.startsWith('pk_live_')) return 'live'
  if (value.startsWith('pk_test_')) return 'test'
  return 'unknown'
}

function liteApiKeyMode(value: string) {
  if (!value) return undefined
  if (value.startsWith('prod_')) return 'production'
  if (value.startsWith('sandbox_') || value.startsWith('test_')) return 'test'
  return 'unknown'
}

function stripTrailingSlash(input: string) {
  return input.replace(/\/$/, '')
}

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, max-age=0' }
}
