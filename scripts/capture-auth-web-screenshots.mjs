import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_ROUTES = [
  { name: 'dashboard', path: '/dashboard', waitForText: 'Baha Buddy' },
  { name: 'trips', path: '/trip', waitForText: 'My Trips' },
  { name: 'profile-bookings', path: '/profile/bookings', waitForText: 'My Bookings' },
  { name: 'profile', path: '/profile', waitForText: 'Profile' },
  { name: 'new-trip', path: '/dashboard/trips/new', waitForText: 'Create a trip' },
  { name: 'trip-detail', path: null, waitForText: 'Dashboard', discover: 'first-trip' },
]

const baseUrl = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const stamp = process.env.SCREENSHOT_STAMP ?? new Date().toISOString().replace(/[:.]/g, '-')
const outputDir = path.resolve(process.cwd(), '..', 'docs', 'visual-review', 'screenshots', stamp, 'web-auth')
const storageStatePath = process.env.SCREENSHOT_AUTH_STORAGE_STATE
  ? path.resolve(process.cwd(), process.env.SCREENSHOT_AUTH_STORAGE_STATE)
  : null
const email = process.env.SCREENSHOT_AUTH_EMAIL
const password = process.env.SCREENSHOT_AUTH_PASSWORD
const requestedRoutes = (process.env.SCREENSHOT_ROUTES ?? '')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean)
const customRoutes = (process.env.SCREENSHOT_CUSTOM_ROUTES ?? process.env.SCREENSHOT_EXTRA_ROUTES ?? '')
  .split(',')
  .map((route, index) => parseRouteSpec(route.trim(), index))
  .filter(Boolean)

const routes = requestedRoutes.length > 0
  ? [
      ...DEFAULT_ROUTES.filter((route) => requestedRoutes.includes(route.name) || (route.path && requestedRoutes.includes(route.path))),
      ...customRoutes.filter((route) => requestedRoutes.includes(route.name) || requestedRoutes.includes(route.path)),
    ]
  : [...DEFAULT_ROUTES, ...customRoutes]

if (routes.length === 0) {
  console.error('No authenticated screenshot routes matched SCREENSHOT_ROUTES.')
  process.exit(1)
}

async function fileExists(filePath) {
  if (!filePath) return false
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function parseRouteSpec(spec, index) {
  if (!spec) return null
  const [rawName, rawPath] = splitRouteSpec(spec)
  const routePath = rawPath?.trim()
  if (!routePath || !routePath.startsWith('/')) {
    throw new Error(`Invalid authenticated screenshot route "${spec}". Use "name=/path" or "/path".`)
  }
  const name = rawName?.trim() || routePath
    .replace(/^\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || `custom-${index + 1}`
  return { name, path: routePath }
}

function splitRouteSpec(spec) {
  const equalIndex = spec.indexOf('=')
  if (equalIndex > 0) {
    return [spec.slice(0, equalIndex), spec.slice(equalIndex + 1)]
  }
  if (spec.startsWith('/')) return [null, spec]
  const colonIndex = spec.indexOf(':')
  if (colonIndex > 0) {
    return [spec.slice(0, colonIndex), spec.slice(colonIndex + 1)]
  }
  return [null, spec]
}

async function assertServerReachable() {
  try {
    const response = await fetch(baseUrl)
    if (!response.ok && response.status >= 500) {
      throw new Error(`Server returned ${response.status}`)
    }
  } catch (error) {
    throw new Error(`Cannot reach ${baseUrl}. Start the web server first with npm run dev. ${error.message}`)
  }
}

async function ensureAuthenticated(page, context) {
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)

  if (!page.url().includes('/login')) return { authenticated: true, usedLogin: false }

  if (!email || !password) {
    throw new Error(
      'Authentication required. Set SCREENSHOT_AUTH_EMAIL and SCREENSHOT_AUTH_PASSWORD, or provide SCREENSHOT_AUTH_STORAGE_STATE with a valid logged-in Playwright state file.',
    )
  }

  await page.locator('#auth-email').fill(email)
  await page.locator('#auth-password').fill(password)
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)

  if (storageStatePath) {
    await fs.mkdir(path.dirname(storageStatePath), { recursive: true })
    await context.storageState({ path: storageStatePath })
  }

  return { authenticated: true, usedLogin: true }
}

async function scrollForLazyImages(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < height; y += 900) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(120)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
}

async function discoverRoute(route, page) {
  if (route.path) return route

  if (route.discover === 'first-trip') {
    await page.goto(`${baseUrl}/trip`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)
    const href = await page
      .locator('a[href^="/trip/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')).find(Boolean) ?? null)

    if (!href) {
      return { ...route, skipReason: 'No trip detail link was available for this authenticated user.' }
    }

    return { ...route, path: href }
  }

  return { ...route, skipReason: `No discovery strategy for ${route.name}.` }
}

await assertServerReachable()
await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const contextOptions = {
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
}

if (await fileExists(storageStatePath)) {
  contextOptions.storageState = storageStatePath
}

const context = await browser.newContext(contextOptions)
const page = await context.newPage()
const authResult = await ensureAuthenticated(page, context)

const captures = []
const skipped = []
const failures = []

for (const inputRoute of routes) {
  const route = await discoverRoute(inputRoute, page)
  if (route.skipReason) {
    skipped.push({ name: route.name, reason: route.skipReason })
    continue
  }

  const url = `${baseUrl}${route.path}`
  const filePath = path.join(outputDir, `${route.name}.png`)

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)

    if (page.url().includes('/login')) {
      throw new Error(`Route redirected to login: ${route.path}`)
    }

    if (route.waitForText) {
      await page.getByText(route.waitForText, { exact: false }).first().waitFor({ timeout: 20_000 }).catch(() => undefined)
    }

    await scrollForLazyImages(page)
    await page.screenshot({ path: filePath, fullPage: true })

    captures.push({
      name: route.name,
      path: route.path,
      url,
      status: response?.status() ?? null,
      screenshot: path.relative(path.resolve(process.cwd(), '..'), filePath),
    })
  } catch (error) {
    failures.push({
      name: route.name,
      path: route.path,
      url,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

await browser.close()

const manifest = {
  capturedAt: new Date().toISOString(),
  baseUrl,
  authenticated: authResult.authenticated,
  usedLogin: authResult.usedLogin,
  outputDir: path.relative(path.resolve(process.cwd(), '..'), outputDir),
  captures,
  skipped,
  failures,
}

await fs.writeFile(
  path.join(outputDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
)

console.log(JSON.stringify(manifest, null, 2))

if (failures.length > 0) {
  process.exit(1)
}
