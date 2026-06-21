#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const env = loadEnvFiles([
  '.env.local',
  '.env',
  '.env.production.local',
  '.env.production',
  '../Baha-Buddy-Admin/.env.local',
])

const supabaseUrl = firstValue(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_URL,
)
const anonKey = firstValue(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  env.SUPABASE_ANON_KEY,
)
const serviceRoleKey = firstValue(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  env.SUPABASE_SERVICE_ROLE_KEY,
)
const baseUrl = firstValue(
  process.env.WEB_BASE_URL,
  env.WEB_BASE_URL,
  'http://localhost:3011',
)
const chromeExecutable = firstValue(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
)

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.',
  )
  process.exit(2)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = crypto.randomUUID().slice(0, 12)
const password = `${crypto.randomUUID()}A!1`
const createdAuthUserIds = []
const createdPublicUserIds = []
const createdTripIds = []
const verifierHeroImageUrl =
  'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg'
let browser
let page

try {
  await assertWebServerReady()
  await cleanupStaleVerifierRows()

  const owner = await createVerifierUser('owner')
  const traveler = await createVerifierUser('traveler')

  const ownedTrip = await createTrip({
    userId: traveler.id,
    name: `Web session owned ${runId}`,
    island: 'Nassau',
    status: 'planned',
    start: '2026-09-03',
    end: '2026-09-07',
  })
  const sharedTrip = await createTrip({
    userId: owner.id,
    name: `Web session shared ${runId}`,
    island: 'Exuma',
    status: 'planned',
    start: '2026-10-10',
    end: '2026-10-14',
  })
  const hiddenTrip = await createTrip({
    userId: owner.id,
    name: `Web session hidden ${runId}`,
    island: 'Bimini',
    status: 'planned',
    start: '2026-11-11',
    end: '2026-11-15',
  })

  await expectSingle(
    'service role can add accepted collaborator for shared trip',
    admin
      .from('trip_collaborators')
      .insert({
        trip_id: sharedTrip.id,
        user_id: traveler.id,
        role: 'editor',
        accepted_at: new Date().toISOString(),
      })
      .select('id, trip_id, user_id, role')
      .single(),
  )

  const travelerClient = await signInAs(traveler.email, password)

  await expectSingle(
    'traveler RLS client can read accepted shared trip before browser check',
    travelerClient
      .from('trips')
      .select('id, name')
      .eq('id', sharedTrip.id)
      .single(),
  )

  await expectSingle(
    'traveler RLS client can read accepted collaborator row before browser check',
    travelerClient
      .from('trip_collaborators')
      .select('trip_id, user_id, role, accepted_at')
      .eq('trip_id', sharedTrip.id)
      .eq('user_id', traveler.id)
      .not('accepted_at', 'is', null)
      .single(),
  )

  browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(chromeExecutable) ? chromeExecutable : undefined,
  })
  page = await browser.newPage({ viewport: { width: 1440, height: 950 } })

  await page.goto(`${baseUrl}/login?redirect=%2Ftrip`, { waitUntil: 'networkidle' })
  await page.fill('#auth-email', traveler.email)
  await page.fill('#auth-password', password)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30000 })

  await page.goto(`${baseUrl}/trip`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'My Trips' }).waitFor({ timeout: 30000 })

  await page.getByText(ownedTrip.name, { exact: false }).first().waitFor({ timeout: 15000 })
  console.log('PASS browser trip list shows traveler-owned trip')

  await page.getByText(sharedTrip.name, { exact: false }).first().waitFor({ timeout: 15000 })
  console.log('PASS browser trip list shows accepted shared trip')

  const hiddenCount = await page.getByText(hiddenTrip.name, { exact: false }).count()
  if (hiddenCount !== 0) {
    throw new Error('browser trip list showed unrelated owner trip')
  }
  console.log('PASS browser trip list hides unrelated trip')

  await page.getByText('2 trips planned and saved.', { exact: false }).first().waitFor({ timeout: 15000 })
  console.log('PASS browser trip list counts owned plus shared trips')

  console.log('Web trip-list browser session verification passed.')
} catch (error) {
  await writeBrowserFailureDiagnostics(page)
  console.error(`Web trip-list browser session verification failed: ${error.message}`)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  await cleanup()
}

async function assertWebServerReady() {
  const response = await fetch(baseUrl)
  if (!response.ok) {
    throw new Error(`web server ${baseUrl} returned ${response.status}`)
  }
}

async function createVerifierUser(kind) {
  const email = `bb-webtrip-${kind}-${runId}@example.invalid`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: 'web-trip-list-verifier', run_id: runId, kind },
  })
  if (error) throw new Error(`create auth user ${kind}: ${error.message}`)
  const id = data.user?.id
  if (!id) throw new Error(`create auth user ${kind}: missing user id`)
  createdAuthUserIds.push(id)

  const profile = await expectSingle(
    `service role can upsert ${kind} public profile`,
    admin
      .from('users')
      .upsert({
        id,
        display_name: `Web Trip ${kind} ${runId}`,
        email,
        country: 'US',
        city: 'Miami',
        party_type: 'friends',
        party_size: 2,
        onboarding_completed: true,
      }, { onConflict: 'id' })
      .select('id, email, onboarding_completed')
      .single(),
  )
  createdPublicUserIds.push(profile.id)
  return { id, email }
}

async function createTrip({ userId, name, island, status, start, end }) {
  const trip = await expectSingle(
    `service role can create ${name}`,
    admin
      .from('trips')
      .insert({
        user_id: userId,
        name,
        status,
        date_start: start,
        date_end: end,
        islands: [island],
        party_type: 'friends',
        party_size: 2,
        hero_image_url: verifierHeroImageUrl,
      })
      .select('id, user_id, name')
      .single(),
  )
  createdTripIds.push(trip.id)
  return trip
}

async function signInAs(email, passwordValue) {
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: passwordValue,
  })
  if (error || !data.session?.access_token) {
    throw new Error(`sign in ${email}: ${error?.message ?? 'missing access token'}`)
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  })
}

async function expectSingle(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  if (!data) throw new Error(`${label}: expected one row`)
  console.log(`PASS ${label}`)
  return data
}

async function writeBrowserFailureDiagnostics(activePage) {
  if (!activePage) return
  try {
    console.error(`Browser URL at failure: ${activePage.url()}`)
    const text = await activePage.locator('body').innerText({ timeout: 2000 }).catch(() => '')
    if (text) {
      console.error(`Browser body at failure: ${text.slice(0, 1200)}`)
    }
    const path = `/private/tmp/baha-web-trip-list-session-${runId}.png`
    await activePage.screenshot({ path, fullPage: true })
    console.error(`Browser failure screenshot: ${path}`)
  } catch (diagnosticError) {
    console.error(`Browser failure diagnostics unavailable: ${diagnosticError.message}`)
  }
}

async function cleanup() {
  const uniqueTripIds = [...new Set(createdTripIds)].filter(Boolean)
  if (uniqueTripIds.length > 0) {
    await admin.from('trip_collaborators').delete().in('trip_id', uniqueTripIds)
    await admin.from('trips').delete().in('id', uniqueTripIds)
  }

  const uniquePublicUserIds = [...new Set(createdPublicUserIds)].filter(Boolean)
  if (uniquePublicUserIds.length > 0) {
    await admin.from('users').delete().in('id', uniquePublicUserIds)
  }

  for (const userId of [...new Set(createdAuthUserIds)].filter(Boolean)) {
    await admin.auth.admin.deleteUser(userId)
  }
}

async function cleanupStaleVerifierRows() {
  await admin.from('users').delete().like('email', 'bb-webtrip-%@example.invalid')

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return
    const stale = data.users.filter((user) => user.email?.startsWith('bb-webtrip-') && user.email.endsWith('@example.invalid'))
    for (const user of stale) {
      await admin.auth.admin.deleteUser(user.id)
    }
    if (data.users.length < 1000) return
  }
}

function loadEnvFiles(files) {
  const out = {}
  for (const file of files) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const index = trimmed.indexOf('=')
      const key = trimmed.slice(0, index).trim()
      let value = trimmed.slice(index + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      out[key] = value
    }
  }
  return out
}

function firstValue(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim()
}
