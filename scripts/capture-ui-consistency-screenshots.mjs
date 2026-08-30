import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_ROUTES = [
  { name: 'home', path: '/' },
  { name: 'stays', path: '/stays' },
  { name: 'flights', path: '/flights' },
  { name: 'explore', path: '/explore' },
  { name: 'destinations', path: '/destinations' },
  { name: 'restaurants', path: '/restaurants' },
  { name: 'deals', path: '/deals' },
  { name: 'guides', path: '/guides' },
  { name: 'about', path: '/about' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'accessibility', path: '/accessibility' },
  { name: 'help', path: '/help' },
  { name: 'contact', path: '/contact' },
  { name: 'how-it-works', path: '/how-it-works' },
  { name: 'partners', path: '/partners' },
  { name: 'list-your-property', path: '/list-your-property' },
  { name: 'concierge-trip-plan', path: '/concierge-trip-plan' },
  { name: 'guided-day', path: '/guided-day' },
  { name: 'nassau-cruise-day-planner', path: '/nassau-cruise-day-planner' },
  { name: 'build-my-cruise-day', path: '/build-my-cruise-day' },
]

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
]

const baseUrl = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const stamp = process.env.SCREENSHOT_STAMP ?? new Date().toISOString().replace(/[:.]/g, '-')
const outputDir = path.resolve(process.cwd(), '..', 'docs', 'visual-review', 'screenshots', stamp, 'ui-consistency')
const fullPage = process.env.SCREENSHOT_FULL_PAGE !== 'false'
const settleMs = Number(process.env.SCREENSHOT_SETTLE_MS ?? '4000')

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
  console.error('No UI consistency routes matched SCREENSHOT_ROUTES.')
  process.exit(1)
}

function parseRouteSpec(spec, index) {
  if (!spec) return null
  const [rawName, rawPath] = splitRouteSpec(spec)
  const routePath = rawPath?.trim()
  if (!routePath || !routePath.startsWith('/')) {
    throw new Error(`Invalid public screenshot route "${spec}". Use "name=/path" or "/path".`)
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

async function scrollForLazyImages(page) {
  if (!fullPage) return
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < height; y += 900) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(120)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
}

async function waitForMedia(page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images)
    await Promise.allSettled(
      images.map((image) => {
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

await assertServerReachable()
await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const captures = []
const failures = []

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile ?? false,
  })
  const page = await context.newPage()

  await page.addInitScript(() => {
    window.localStorage.setItem('baha_travel_origin_prompt_dismissed', new Date().toISOString())
  })

  for (const route of routes) {
    const url = `${baseUrl}${route.path}`
    const filePath = path.join(outputDir, `${viewport.name}-${route.name}.png`)

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined)
      await scrollForLazyImages(page)
      await waitForMedia(page).catch(() => undefined)
      await page.waitForTimeout(settleMs)
      await page.screenshot({ path: filePath, fullPage })

      captures.push({
        viewport: viewport.name,
        name: route.name,
        path: route.path,
        url,
        status: response?.status() ?? null,
        screenshot: path.relative(path.resolve(process.cwd(), '..'), filePath),
      })
    } catch (error) {
      failures.push({
        viewport: viewport.name,
        name: route.name,
        path: route.path,
        url,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  await context.close()
}

await browser.close()

const manifest = {
  capturedAt: new Date().toISOString(),
  baseUrl,
  outputDir: path.relative(path.resolve(process.cwd(), '..'), outputDir),
  fullPage,
  routeCount: routes.length,
  viewports: VIEWPORTS.map(({ name, width, height }) => ({ name, width, height })),
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
