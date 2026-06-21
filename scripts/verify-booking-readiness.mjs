#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

const args = new Set(process.argv.slice(2))
const shouldCheckRemote = args.has('--remote-edge')

loadEnvFile('.env.local')

const runtimeUrl = argValue('--runtime-url') || process.env.BOOKING_READINESS_RUNTIME_URL

const checks = []

checkEnv()
checkPublicSecretExposure()
checkSourceContracts()

if (shouldCheckRemote) {
  await checkRemoteEdgeFunctions()
}

if (runtimeUrl) {
  await checkDeployedRuntime(runtimeUrl)
}

const failed = checks.filter((check) => check.status === 'FAIL')
for (const check of checks) {
  const suffix = check.detail ? ` - ${check.detail}` : ''
  console.log(`${check.status} ${check.label}${suffix}`)
}

if (failed.length > 0) {
  console.error(`Booking readiness failed: ${failed.length} check(s) failed.`)
  process.exit(1)
}

console.log('Booking readiness verified without creating payments or provider bookings.')

function checkEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ]

  for (const key of required) {
    addCheck(`env ${key}`, Boolean(value(key)), 'Required for web booking/auth/payment readiness.')
  }

  addCheck(
    'env LiteAPI private key',
    Boolean(value('TRAVEL_BOOKING_API_KEY') || value('LITEAPI_API_KEY')),
    'Set TRAVEL_BOOKING_API_KEY or LITEAPI_API_KEY on the server only.',
  )

  addCheck(
    'env booking API base URL',
    /^https:\/\/api\.liteapi\.travel\/v3\.0$/.test(stripTrailingSlash(value('TRAVEL_BOOKING_API_BASE_URL') || 'https://api.liteapi.travel/v3.0')),
    'Expected LiteAPI v3 rate/search base URL.',
  )

  addCheck(
    'env booking book base URL',
    /^https:\/\/book\.liteapi\.travel\/v3\.0$/.test(stripTrailingSlash(value('TRAVEL_BOOKING_BOOK_BASE_URL') || 'https://book.liteapi.travel/v3.0')),
    'Expected LiteAPI v3 prebook/book base URL.',
  )
}

function checkPublicSecretExposure() {
  const publicAllowlist = new Set([
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SANITY_PROJECT_ID',
    'NEXT_PUBLIC_SANITY_DATASET',
    'NEXT_PUBLIC_SANITY_API_VERSION',
    'NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY',
  ])
  const envLines = readEnvLines('.env.local')
  const publicKeys = envLines
    .map((line) => line.key)
    .filter((key) => key.startsWith('NEXT_PUBLIC_'))

  const suspicious = publicKeys.filter((key) => {
    if (publicAllowlist.has(key)) return false
    return /(SECRET|PRIVATE|SERVICE|TOKEN|API_KEY|KEY)$/i.test(key)
  })

  addCheck(
    'public env secret exposure',
    suspicious.length === 0,
    suspicious.length > 0
      ? `Unexpected public secret-like keys: ${suspicious.join(', ')}`
      : 'No unexpected NEXT_PUBLIC secret-like keys found.',
  )
}

function checkSourceContracts() {
  const provider = source('src/lib/travel-booking/provider.ts')
  const paymentIntent = source('src/app/api/booking/payments/intent/route.ts')
  const stripeHelper = source('src/lib/stripe/edge-function.ts')
  const hotelBook = source('src/app/api/booking/hotels/book/route.ts')
  const flightBook = source('src/app/api/booking/flights/book/route.ts')
  const hotelPrebook = source('src/app/api/booking/hotels/prebook/route.ts')
  const flightPrebook = source('src/app/api/booking/flights/prebook/route.ts')
  const runtimeReadiness = source('src/app/api/internal/booking-readiness/route.ts')

  addCheck(
    'LiteAPI server-side provider',
    provider.includes('TRAVEL_BOOKING_API_KEY') &&
      provider.includes('LITEAPI_API_KEY') &&
      provider.includes('https://api.liteapi.travel/v3.0') &&
      provider.includes('https://book.liteapi.travel/v3.0'),
    'Provider must keep LiteAPI calls server-side and default to LiteAPI v3 endpoints.',
  )

  addCheck(
    'Stripe PaymentIntent handoff',
    paymentIntent.includes('createPaymentIntent') &&
      stripeHelper.includes('/functions/v1/stripe-payment') &&
      stripeHelper.includes('Authorization: `Bearer ${input.accessToken}`'),
    'Web booking payment route must use the Supabase stripe-payment Edge Function with the user token.',
  )

  addCheck(
    'hotel prebook uses booking base',
    hotelPrebook.includes("callTravelProvider('/rates/prebook'") && hotelPrebook.includes('useBookBase: true'),
    'Hotel prebook must call LiteAPI booking base, not client code.',
  )

  addCheck(
    'flight prebook uses LiteAPI prebooks',
    flightPrebook.includes("callTravelProvider('/flights/prebooks'"),
    'Flight prebook must call LiteAPI server-side prebook endpoint.',
  )

  checkBookRoute('hotel booking persistence', hotelBook, [
    'createAdminClient',
    "from('bookings')",
    "from('trip_accommodations')",
    "from('travel_booking_records')",
    'localStatus',
    'supportRequired',
    'sourceSurface',
  ])

  checkBookRoute('flight booking persistence', flightBook, [
    'createAdminClient',
    "from('bookings')",
    "from('trip_flights')",
    "from('travel_booking_records')",
    'localStatus',
    'supportRequired',
    'sourceSurface',
  ])

  addCheck(
    'deployed runtime readiness endpoint',
    runtimeReadiness.includes('BOOKING_READINESS_TOKEN') &&
      runtimeReadiness.includes('SUPABASE_SERVICE_ROLE_KEY') &&
      runtimeReadiness.includes('travel_booking_records') &&
      runtimeReadiness.includes('sourceModel') &&
      runtimeReadiness.includes('no-store'),
    'Protected endpoint must prove deployed web runtime env/schema without creating payments or provider bookings.',
  )
}

async function checkRemoteEdgeFunctions() {
  const supabaseUrl = stripTrailingSlash(value('NEXT_PUBLIC_SUPABASE_URL'))
  if (!supabaseUrl) {
    addCheck('remote stripe-payment function', false, 'NEXT_PUBLIC_SUPABASE_URL is missing.')
    return
  }

  const functions = [
    { name: 'stripe-payment', path: '/functions/v1/stripe-payment' },
    { name: 'liteapi-proxy', path: '/functions/v1/liteapi-proxy' },
  ]

  for (const fn of functions) {
    try {
      const response = await fetch(`${supabaseUrl}${fn.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      addCheck(
        `remote ${fn.name} function deployed`,
        response.status !== 404,
        `HTTP ${response.status}; expected any deployed-function response except 404.`,
      )
    } catch (error) {
      addCheck(
        `remote ${fn.name} function deployed`,
        false,
        error instanceof Error ? error.message : 'Remote function check failed.',
      )
    }
  }
}

async function checkDeployedRuntime(url) {
  const token = value('BOOKING_READINESS_TOKEN') || value('INTERNAL_API_SECRET')
  if (!token) {
    addCheck(
      'deployed web booking runtime',
      false,
      'Set BOOKING_READINESS_TOKEN or INTERNAL_API_SECRET locally before using --runtime-url.',
    )
    return
  }

  try {
    const response = await fetch(`${stripTrailingSlash(url)}/api/internal/booking-readiness`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const body = await response.json().catch(() => ({}))
    const serialized = JSON.stringify(body)
    const leakedValues = [
      token,
      value('SUPABASE_SERVICE_ROLE_KEY'),
      value('TRAVEL_BOOKING_API_KEY'),
      value('LITEAPI_API_KEY'),
    ].filter((secret) => secret && secret.length > 12 && serialized.includes(secret))

    addCheck(
      'deployed web booking runtime',
      response.ok && body.ready === true && leakedValues.length === 0,
      response.ok
        ? `HTTP ${response.status}; ready=${body.ready === true}; checkedAt=${body.checkedAt || 'unknown'}`
        : `HTTP ${response.status}; ready=${body.ready === true}; endpoint must return ready=true.`,
    )

    addCheck(
      'deployed runtime source model',
      Array.isArray(body.sourceModel?.operational) &&
        body.sourceModel.operational.includes('bookings') &&
        body.sourceModel.operational.includes('trip_accommodations') &&
        body.sourceModel.operational.includes('trip_flights') &&
        Array.isArray(body.sourceModel?.auditOnly) &&
        body.sourceModel.auditOnly.includes('travel_booking_records'),
      'Runtime response must identify canonical operational tables separately from audit-only provider records.',
    )
  } catch (error) {
    addCheck(
      'deployed web booking runtime',
      false,
      error instanceof Error ? error.message : 'Runtime readiness check failed.',
    )
  }
}

function checkBookRoute(label, content, requiredSnippets) {
  const missing = requiredSnippets.filter((snippet) => !content.includes(snippet))
  addCheck(
    label,
    missing.length === 0,
    missing.length > 0 ? `Missing source markers: ${missing.join(', ')}` : 'Canonical booking, trip item, audit, and support state markers found.',
  )
}

function addCheck(label, passed, detail = '') {
  checks.push({ label, status: passed ? 'PASS' : 'FAIL', detail })
}

function source(path) {
  if (!existsSync(path)) {
    addCheck(`source ${path}`, false, 'File missing.')
    return ''
  }
  return readFileSync(path, 'utf8')
}

function value(key) {
  return process.env[key]?.trim() ?? ''
}

function stripTrailingSlash(input) {
  return String(input ?? '').replace(/\/$/, '')
}

function loadEnvFile(path) {
  for (const { key, value: rawValue } of readEnvLines(path)) {
    if (!process.env[key]) process.env[key] = rawValue
  }
}

function readEnvLines(path) {
  if (!existsSync(path)) return []

  const lines = []
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue

    const key = trimmed.slice(0, index).trim()
    const rawValue = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) lines.push({ key, value: rawValue })
  }
  return lines
}

function argValue(name) {
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i]
    if (value === name) return argv[i + 1] ?? ''
    if (value.startsWith(`${name}=`)) return value.slice(name.length + 1)
  }
  return ''
}
