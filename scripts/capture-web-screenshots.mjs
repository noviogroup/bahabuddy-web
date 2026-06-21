import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_ROUTES = [
  { name: 'home', path: '/', waitForText: 'Your AI Bahamas travel companion' },
  { name: 'stays', path: '/stays', waitForText: 'Stays' },
  { name: 'flights', path: '/flights', waitForText: 'Book this fare' },
  { name: 'explore', path: '/explore', waitForText: 'Explore' },
  { name: 'destinations', path: '/destinations', waitForText: 'Destinations' },
  { name: 'restaurants', path: '/restaurants', waitForText: 'Restaurants' },
  { name: 'deals', path: '/deals', waitForText: 'Deals' },
  { name: 'about', path: '/about', waitForText: 'About Baha Buddy' },
]

const baseUrl = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const stamp = process.env.SCREENSHOT_STAMP ?? new Date().toISOString().replace(/[:.]/g, '-')
const outputDir = path.resolve(process.cwd(), '..', 'docs', 'visual-review', 'screenshots', stamp, 'web')
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
      ...DEFAULT_ROUTES.filter((route) => requestedRoutes.includes(route.name) || requestedRoutes.includes(route.path)),
      ...customRoutes.filter((route) => requestedRoutes.includes(route.name) || requestedRoutes.includes(route.path)),
    ]
  : [...DEFAULT_ROUTES, ...customRoutes]

if (routes.length === 0) {
  console.error('No screenshot routes matched SCREENSHOT_ROUTES.')
  process.exit(1)
}

function parseRouteSpec(spec, index) {
  if (!spec) return null
  const [rawName, rawPath] = splitRouteSpec(spec)
  const routePath = rawPath?.trim()
  if (!routePath || !routePath.startsWith('/')) {
    throw new Error(`Invalid screenshot route "${spec}". Use "name=/path" or "/path".`)
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

await assertServerReachable()
await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
})

if (process.env.SCREENSHOT_SHOW_ORIGIN_PROMPT !== '1') {
  await page.addInitScript(() => {
    window.localStorage.setItem('baha_travel_origin_prompt_dismissed', new Date().toISOString())
  })
}

async function scrollForLazyImages(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < height; y += 900) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(120)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
}

const captures = []
const failures = []

for (const route of routes) {
  const url = `${baseUrl}${route.path}`
  const filePath = path.join(outputDir, `${route.name}.png`)

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined)

    if (route.waitForText) {
      await page.getByText(route.waitForText, { exact: false }).first().waitFor({ timeout: 45_000 }).catch(() => undefined)
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
  outputDir: path.relative(path.resolve(process.cwd(), '..'), outputDir),
  captures,
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
