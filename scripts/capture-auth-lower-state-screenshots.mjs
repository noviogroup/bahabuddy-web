#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
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
const serviceRoleKey = firstValue(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  env.SUPABASE_SERVICE_ROLE_KEY,
)
const baseUrl = firstValue(
  process.env.BASE_URL,
  process.env.WEB_BASE_URL,
  env.WEB_BASE_URL,
  'http://localhost:3011',
).replace(/\/$/, '')
const stamp = process.env.SCREENSHOT_STAMP ?? new Date().toISOString().replace(/[:.]/g, '-')
const outputDir = path.resolve(process.cwd(), '..', 'docs', 'visual-review', 'screenshots', stamp, 'web-auth-lower')
const settleMs = Number(process.env.SCREENSHOT_SETTLE_MS ?? '4000')

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
]

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(2)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = randomUUID().slice(0, 12)
const qaEmail = `bb-authui-${runId}@example.invalid`
const qaPassword = `${randomUUID()}A!1`
const createdAuthUserIds = []
const createdPublicUserIds = []
const createdTripIds = []
const createdThreadIds = []
const captures = []
const failures = []
const authResults = []
const consoleEvents = []
let cleanupCompleted = false

const fixtureOfferId = `visualqa-flight-${runId}`
const futureDepart = futureDate(21)
const futureReturn = futureDate(26)
const flightCards = [
  {
    card_type: 'flight',
    offer_id: fixtureOfferId,
    provider_offer_id: fixtureOfferId,
    route: 'MIA to NAS',
    airline: 'American Airlines',
    airline_code: 'AA',
    airline_logo_url: 'https://images.kiwi.com/airlines/64/AA.png',
    departure: '8:15 AM',
    arrival: '9:20 AM',
    duration: '1h 05m',
    stops: 'Direct',
    price: 328,
    currency: 'USD',
    passengers: 2,
    cabin_class: 'Economy',
    fare_brand: 'Main Cabin',
    baggage: { carry_on: true, checked: 1 },
    refundable: false,
    changeable: true,
    expiration: `${futureDepart}T16:30:00-04:00`,
  },
  {
    card_type: 'flight',
    offer_id: `${fixtureOfferId}-connect`,
    provider_offer_id: `${fixtureOfferId}-connect`,
    route: 'MIA to NAS',
    airline: 'Delta Air Lines',
    airline_code: 'DL',
    airline_logo_url: 'https://images.kiwi.com/airlines/64/DL.png',
    departure: '11:40 AM',
    arrival: '4:30 PM',
    duration: '4h 50m',
    stops: '1 stop',
    price: 292,
    currency: 'USD',
    passengers: 2,
    cabin_class: 'Economy',
    fare_brand: 'Basic',
    baggage: { carry_on: true },
    refundable: false,
    changeable: false,
    layovers: [{ airport: 'ATL', duration: '1h 25m' }],
    expiration: `${futureDepart}T18:15:00-04:00`,
  },
]

let browser

try {
  await assertWebServerReady()
  await fs.mkdir(outputDir, { recursive: true })
  await cleanupStaleRows()

  const user = await createQaUser()
  const trip = await createQaTrip(user.id)
  await createQaChatThread({ userId: user.id, tripId: trip.id })

  browser = await chromium.launch({ headless: true })

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.isMobile ?? false,
    })
    const page = await context.newPage()

    page.on('pageerror', (error) => {
      consoleEvents.push({
        viewport: viewport.name,
        type: 'pageerror',
        message: error.message,
      })
    })
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      consoleEvents.push({
        viewport: viewport.name,
        type: 'console.error',
        message: message.text(),
      })
    })

    await page.addInitScript(() => {
      window.localStorage.setItem('baha_travel_origin_prompt_dismissed', new Date().toISOString())
    })

    await page.route('**/api/flights/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: flightCards,
          count: flightCards.length,
          cards: flightCards,
        }),
      })
    })

    const auth = await signIntoWeb(page)
    authResults.push({ viewport: viewport.name, ...auth })

    await captureProfileStates(page, viewport.name)
    await captureCreateTripState(page, viewport.name)
    await captureChatDirectActionStates(page, viewport.name, trip.id)
    await captureDashboardFlightStates(page, viewport.name)

    await context.close()
  }
} catch (error) {
  failures.push({
    name: 'script',
    error: error instanceof Error ? error.message : String(error),
  })
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  try {
    await cleanup()
    cleanupCompleted = true
  } catch (error) {
    failures.push({
      name: 'cleanup',
      error: error instanceof Error ? error.message : String(error),
    })
    process.exitCode = 1
  }
  await writeManifest()
}

if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2))
  process.exit(1)
}

async function assertWebServerReady() {
  const response = await fetch(baseUrl)
  if (!response.ok && response.status >= 500) {
    throw new Error(`Web server ${baseUrl} returned ${response.status}`)
  }
}

async function createQaUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email: qaEmail,
    password: qaPassword,
    email_confirm: true,
    user_metadata: {
      source: 'auth-lower-state-screenshot',
      run_id: runId,
    },
  })
  if (error) throw new Error(`Create QA auth user failed: ${error.message}`)
  const id = data.user?.id
  if (!id) throw new Error('Create QA auth user failed: missing user id')
  createdAuthUserIds.push(id)

  const profile = await expectSingle(
    'upsert QA public profile',
    admin
      .from('users')
      .upsert({
        id,
        display_name: `Visual QA Traveler ${runId}`,
        email: qaEmail,
        country: 'United States',
        city: 'Miami',
        party_type: 'friends',
        party_size: 2,
        children_count: 0,
        interest_tags: ['beaches', 'food', 'culture'],
        onboarding_completed: true,
      }, { onConflict: 'id' })
      .select('id')
      .single(),
  )
  createdPublicUserIds.push(profile.id)
  return { id, email: qaEmail }
}

async function createQaTrip(userId) {
  const trip = await expectSingle(
    'create QA trip',
    admin
      .from('trips')
      .insert({
        user_id: userId,
        name: `Visual QA Nassau Flight Decisions ${runId}`,
        status: 'planned',
        date_start: futureDepart,
        date_end: futureReturn,
        islands: ['Nassau'],
        party_type: 'friends',
        party_size: 2,
        budget_estimate: 2400,
        hero_image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
      })
      .select('id')
      .single(),
  )
  createdTripIds.push(trip.id)
  return trip
}

async function createQaChatThread({ userId, tripId }) {
  const thread = await expectSingle(
    'create QA chat thread',
    admin
      .from('chat_threads')
      .insert({
        user_id: userId,
        trip_id: tripId,
        last_message_preview: 'Visual QA flight options for Nassau',
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single(),
  )
  createdThreadIds.push(thread.id)

  await admin.from('trips').update({ chat_thread_id: thread.id }).eq('id', tripId)

  const { error } = await admin.from('chat_messages').insert([
    {
      thread_id: thread.id,
      role: 'user',
      content: 'Show me flights from Miami to Nassau for my trip.',
      card_type: 'none',
    },
    {
      thread_id: thread.id,
      role: 'assistant',
      content: 'Here are two fare options with enough detail to compare timing, baggage, rules, and price before booking.',
      card_type: 'flight',
      card_data: flightCards,
    },
  ])
  if (error) throw new Error(`Create QA chat messages failed: ${error.message}`)
}

async function signIntoWeb(page) {
  await page.goto(`${baseUrl}/login?redirect=%2Fdashboard`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)
  await page.locator('#auth-email').fill(qaEmail)
  await page.locator('#auth-password').fill(qaPassword)
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)
  return { authenticated: true, usedTemporaryQaUser: true }
}

async function captureProfileStates(page, viewportName) {
  await page.goto(`${baseUrl}/profile`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)
  await page.getByRole('heading', { name: 'Profile' }).waitFor({ timeout: 20_000 })

  const dirtyCity = viewportName === 'mobile' ? 'Orlando' : 'Fort Lauderdale'

  await page.locator('#city').fill(dirtyCity)
  await page.waitForFunction((expectedCity) => {
    const cityInput = document.querySelector('#city')
    const saveButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Save changes'))

    return cityInput instanceof HTMLInputElement &&
      cityInput.value === expectedCity &&
      saveButton instanceof HTMLButtonElement &&
      !saveButton.disabled &&
      saveButton.getAttribute('aria-disabled') !== 'true'
  }, dirtyCity, { timeout: 10_000 })
  await capture(page, viewportName, 'profile-dirty', '/profile')

  await page.locator('#display_name').fill('')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByText('Display name must be 1-80 characters.').waitFor({ timeout: 10_000 })
  await capture(page, viewportName, 'profile-error', '/profile')

  await page.locator('#display_name').fill(`Visual QA Traveler Saved ${runId}`)
  await page.locator('#display_name').evaluate((input, expected) => {
    if (!(input instanceof HTMLInputElement) || input.value !== expected) {
      throw new Error('Display name field did not update before save.')
    }
  }, `Visual QA Traveler Saved ${runId}`)
  await page.locator('#party_size').fill('3')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForFunction(() => {
    const bodyText = document.body.innerText
    const alertText = document.querySelector('[role="alert"]')?.textContent ?? ''
    return bodyText.includes('Saved!') || alertText.trim().length > 0
  }, null, { timeout: 60_000 })
  const profileSaveOutcome = await page.evaluate(() => ({
    saved: document.body.innerText.includes('Saved!'),
    alert: document.querySelector('[role="alert"]')?.textContent?.trim() ?? '',
  }))
  if (!profileSaveOutcome.saved) {
    throw new Error(`Profile save did not succeed: ${profileSaveOutcome.alert || 'no status message'}`)
  }
  await page.waitForFunction(() => {
    const bodyText = document.body.innerText
    return bodyText.includes('Saved!') && !bodyText.includes('Saving...')
  }, null, { timeout: 5_000 }).catch(() => undefined)
  await capture(page, viewportName, 'profile-saved', '/profile', { scrollLazyImages: false })
}

async function captureCreateTripState(page, viewportName) {
  const createTripPath = `/dashboard/trips/new?returnTo=${encodeURIComponent('/stays/lp6558fbc7#trip-actions')}&source=stay&destination=nassau&seed=${encodeURIComponent('Save this Nassau stay first, then compare nearby restaurants and flights.')}`
  await page.goto(`${baseUrl}${createTripPath}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)
  await page.getByRole('heading', { name: 'Create a trip' }).waitFor({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Specific dates' }).click()
  await page.getByText('Return path ready').waitFor({ timeout: 10_000 })
  await capture(page, viewportName, 'create-trip-dates-return-path', createTripPath)
}

async function captureChatDirectActionStates(page, viewportName, tripId) {
  const chatPath = `/dashboard/chat?trip=${encodeURIComponent(tripId)}`
  await page.goto(`${baseUrl}${chatPath}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)
  await page.getByText('Visual QA flight options for Nassau').first().waitFor({ timeout: 20_000 }).catch(async () => {
    await page.getByRole('button', { name: /Open conversation sidebar/i }).click()
    await page.getByText('Visual QA flight options for Nassau').first().waitFor({ timeout: 20_000 })
  })
  await page.getByText('Visual QA flight options for Nassau').first().click()
  await page.getByText('Book this fare').first().waitFor({ timeout: 20_000 })
  await capture(page, viewportName, 'chat-card-direct-actions', chatPath)

  await page.getByRole('button', { name: 'Add to trip' }).first().click()
  await page.getByText('Saved MIA to NAS to your trip.').waitFor({ timeout: 20_000 })
  await capture(page, viewportName, 'chat-card-add-to-trip-success', chatPath)
}

async function captureDashboardFlightStates(page, viewportName) {
  const flightPath = `/dashboard/flights?origin=Miami&destination=NAS&tripType=one_way&depart=${futureDepart}&passengers=2&cabin=economy`
  await page.goto(`${baseUrl}${flightPath}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)
  await page.getByText('Live results').waitFor({ timeout: 20_000 })
  await page.getByText('Book this fare').first().waitFor({ timeout: 20_000 })
  await capture(page, viewportName, 'dashboard-flights-results', flightPath)

  await page.getByRole('button', { name: /Nonstop/i }).click()
  await page.getByText('Non-stop').first().waitFor({ timeout: 10_000 })
  await capture(page, viewportName, 'dashboard-flights-nonstop-filter', flightPath)
}

async function capture(page, viewportName, name, routePath, options = {}) {
  if (options.scrollLazyImages !== false) {
    await scrollForLazyImages(page)
  }
  await waitForMedia(page).catch(() => undefined)
  await page.waitForTimeout(settleMs)
  const filePath = path.join(outputDir, `${viewportName}-${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  captures.push({
    viewport: viewportName,
    name,
    path: routePath,
    url: page.url(),
    screenshot: path.relative(path.resolve(process.cwd(), '..'), filePath),
  })
}

async function scrollForLazyImages(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < height; y += 900) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(100)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(350)
}

async function waitForMedia(page) {
  await page.evaluate(async () => {
    await Promise.allSettled(
      Array.from(document.images).map((image) => {
        if (image.complete && image.naturalWidth > 0) return undefined
        return image.decode?.().catch(() => undefined)
      }),
    )
    await Promise.allSettled(
      Array.from(document.querySelectorAll('video')).map(
        (video) =>
          new Promise((resolve) => {
            if (video.readyState >= 2) {
              resolve(undefined)
              return
            }
            const done = () => resolve(undefined)
            video.addEventListener('loadeddata', done, { once: true })
            video.addEventListener('error', done, { once: true })
            setTimeout(done, 2000)
          }),
      ),
    )
  })
}

async function writeManifest() {
  await fs.mkdir(outputDir, { recursive: true })
  const manifest = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    outputDir: path.relative(path.resolve(process.cwd(), '..'), outputDir),
    authResults,
    consoleEvents,
    routeCount: 6,
    viewports: VIEWPORTS.map(({ name, width, height }) => ({ name, width, height })),
    fixture: {
      type: 'temporary-auth-web-lower-state',
      runId,
      cleanedUp: cleanupCompleted,
      seededTrip: 'Visual QA Nassau Flight Decisions',
      seededChatCardTypes: ['flight'],
      flightSearchApi: 'mocked for deterministic UI-state capture',
    },
    captures,
    failures,
  }
  await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(manifest, null, 2))
}

async function cleanup() {
  const uniqueTripIds = [...new Set(createdTripIds)].filter(Boolean)
  if (uniqueTripIds.length > 0) {
    await admin.from('trip_flights').delete().in('trip_id', uniqueTripIds)
    await admin.from('trip_accommodations').delete().in('trip_id', uniqueTripIds)
    await admin.from('trip_activities').delete().in('trip_id', uniqueTripIds)
    await admin.from('chat_threads').delete().in('trip_id', uniqueTripIds)
    await admin.from('trips').delete().in('id', uniqueTripIds)
  }

  const uniqueThreadIds = [...new Set(createdThreadIds)].filter(Boolean)
  if (uniqueThreadIds.length > 0) {
    await admin.from('chat_messages').delete().in('thread_id', uniqueThreadIds)
    await admin.from('chat_threads').delete().in('id', uniqueThreadIds)
  }

  const uniquePublicUserIds = [...new Set(createdPublicUserIds)].filter(Boolean)
  if (uniquePublicUserIds.length > 0) {
    await admin.from('users').delete().in('id', uniquePublicUserIds)
  }

  for (const userId of [...new Set(createdAuthUserIds)].filter(Boolean)) {
    await admin.auth.admin.deleteUser(userId)
  }
}

async function cleanupStaleRows() {
  const { data: staleUsers } = await admin
    .from('users')
    .select('id')
    .like('email', 'bb-authui-%@example.invalid')

  const staleUserIds = (staleUsers ?? []).map((row) => row.id).filter(Boolean)
  if (staleUserIds.length > 0) {
    const { data: staleTrips } = await admin
      .from('trips')
      .select('id')
      .in('user_id', staleUserIds)
    const staleTripIds = (staleTrips ?? []).map((row) => row.id).filter(Boolean)
    if (staleTripIds.length > 0) {
      await admin.from('trip_flights').delete().in('trip_id', staleTripIds)
      await admin.from('trip_accommodations').delete().in('trip_id', staleTripIds)
      await admin.from('trip_activities').delete().in('trip_id', staleTripIds)
      await admin.from('chat_threads').delete().in('trip_id', staleTripIds)
      await admin.from('trips').delete().in('id', staleTripIds)
    }
    await admin.from('users').delete().in('id', staleUserIds)
  }

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users) return
    const staleAuthUsers = data.users.filter((user) => user.email?.startsWith('bb-authui-') && user.email.endsWith('@example.invalid'))
    for (const user of staleAuthUsers) {
      await admin.auth.admin.deleteUser(user.id)
    }
    if (data.users.length < 1000) return
  }
}

async function expectSingle(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  if (!data) throw new Error(`${label}: expected one row`)
  return data
}

function futureDate(daysFromNow) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().slice(0, 10)
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
