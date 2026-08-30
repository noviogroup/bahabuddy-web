#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const repoRoot = path.resolve(process.cwd(), '..')
const screenshotStamp = process.env.SCREENSHOT_STAMP ?? '2026-06-25-delayed-4s'
const outputDir = path.join(repoRoot, 'docs', 'marketing', 'mockups', '2026-06-25-delayed-clean-v3')

const sources = {
  logo: path.join(repoRoot, 'bahabuddy-web', 'public', 'brand', 'logo.png'),
  webHome: path.join(repoRoot, 'docs', 'visual-review', 'screenshots', screenshotStamp, 'web', 'home.png'),
  mobileHome: path.join(repoRoot, 'docs', 'visual-review', 'screenshots', screenshotStamp, 'mobile-app', 'mobile-02-home-dashboard.png'),
  mobileBooking: path.join(repoRoot, 'docs', 'visual-review', 'screenshots', screenshotStamp, 'mobile-app', 'mobile-09-booking-confirmed.png'),
  desktopChat: path.join(repoRoot, 'docs', 'visual-review', 'screenshots', '2026-06-23-web-auth-lower-state-ui-consistency-v10', 'web-auth-lower', 'desktop-chat-card-direct-actions.png'),
  mobileChat: path.join(repoRoot, 'docs', 'visual-review', 'screenshots', '2026-06-23-web-auth-lower-state-ui-consistency-v10', 'web-auth-lower', 'mobile-chat-card-direct-actions.png'),
  desktopSaved: path.join(repoRoot, 'docs', 'visual-review', 'screenshots', '2026-06-23-web-auth-lower-state-ui-consistency-v10', 'web-auth-lower', 'desktop-chat-card-add-to-trip-success.png'),
}

await assertSourcesExist()
await fs.mkdir(outputDir, { recursive: true })
const sourceUrls = await buildSourceUrls()

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
})

const variants = [
  {
    file: '01-take-the-bahamas-with-you.png',
    title: 'Take the Bahamas with you.',
    eyebrow: 'AI BAHAMAS TRAVEL COMPANION',
    body: "Tell Buddy what you're thinking, and he'll plan your perfect Bahamas trip.",
    note: 'Bahamas-only AI travel companion',
    theme: 'home',
    laptop: sources.webHome,
    phone: sources.mobileHome,
    laptopClass: 'home-laptop',
    phoneClass: 'home-phone',
  },
  {
    file: '02-one-chat-ready-trip.png',
    title: 'One chat. Ready trip.',
    eyebrow: 'CONVERSATION-FIRST PLANNING',
    body: 'Buddy compares options, answers questions, and saves the plan without turning trip planning into a form.',
    note: 'Flights, stays, food, tours',
    theme: 'conversation',
    laptop: sources.desktopChat,
    phone: sources.mobileChat,
    laptopClass: 'chat-laptop',
    phoneClass: 'chat-phone',
  },
  {
    file: '03-booking-confidence.png',
    title: 'Booking confidence, built into chat.',
    eyebrow: 'PLAN TO BOOKING',
    body: 'Travelers can compare real options, save the choice, and keep trip details connected across web and mobile.',
    note: 'Stripe-ready booking flow',
    theme: 'booking',
    laptop: sources.desktopSaved,
    phone: sources.mobileBooking,
    laptopClass: 'booking-laptop',
    phoneClass: 'booking-phone',
  },
]

for (const variant of variants) {
  await page.setContent(renderHtml(variant), { waitUntil: 'load' })
  await waitForImages(page)
  await page.screenshot({ path: path.join(outputDir, variant.file) })
}

await browser.close()

console.log(JSON.stringify({
  outputDir,
  files: variants.map((variant) => path.join(outputDir, variant.file)),
}, null, 2))

async function assertSourcesExist() {
  const missing = []
  for (const [name, filePath] of Object.entries(sources)) {
    try {
      await fs.access(filePath)
    } catch {
      missing.push(`${name}: ${filePath}`)
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing mockup source images:\n${missing.join('\n')}`)
  }
}

async function buildSourceUrls() {
  const urls = {}
  for (const [name, filePath] of Object.entries(sources)) {
    const buffer = await fs.readFile(filePath)
    urls[name] = `data:${mimeFor(filePath)};base64,${buffer.toString('base64')}`
  }
  return urls
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  return 'image/png'
}

async function waitForImages(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images).map(async (image) => {
        if (image.complete && image.naturalWidth > 0) return
        await image.decode().catch(() => undefined)
      }),
    )
  })
}

function renderHtml(variant) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; }
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #08223c;
      background: #f7fbff;
      letter-spacing: 0;
    }
    .canvas {
      position: relative;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.96) 0 38%, rgba(235,249,255,0.92) 38% 100%),
        linear-gradient(180deg, #f7fbff 0%, #eef9fd 100%);
    }
    .canvas.home {
      background:
        linear-gradient(90deg, rgba(255,255,255,0.98) 0 39%, rgba(231,249,255,0.86) 39% 100%),
        #f7fbff;
    }
    .canvas.conversation {
      background:
        linear-gradient(90deg, #ffffff 0 36%, #edf9fd 36% 100%);
    }
    .canvas.booking {
      background:
        linear-gradient(90deg, #fffdf8 0 35%, #f1fbff 35% 100%);
    }
    .topline {
      position: absolute;
      left: 104px;
      top: 72px;
      display: flex;
      align-items: center;
      gap: 18px;
      font-size: 28px;
      font-weight: 760;
      color: #10253d;
    }
    .logo {
      width: 48px;
      height: 48px;
      border-radius: 11px;
      object-fit: cover;
      box-shadow: 0 10px 28px rgba(0, 113, 206, 0.18);
    }
    .copy {
      position: absolute;
      left: 104px;
      top: 204px;
      width: 560px;
      z-index: 3;
    }
    .eyebrow {
      color: #2579ce;
      font-size: 22px;
      line-height: 1;
      font-weight: 850;
      letter-spacing: 0;
      margin-bottom: 30px;
    }
    h1 {
      margin: 0;
      font-size: 74px;
      line-height: 0.98;
      letter-spacing: 0;
      font-weight: 860;
      color: #08223c;
    }
    p {
      width: 500px;
      margin: 30px 0 0;
      color: #5c7085;
      font-size: 28px;
      line-height: 1.32;
      font-weight: 520;
    }
    .note {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      margin-top: 38px;
      padding: 16px 22px;
      border: 1px solid rgba(9, 86, 153, 0.13);
      border-radius: 999px;
      color: #12314f;
      background: rgba(255,255,255,0.86);
      box-shadow: 0 16px 40px rgba(8, 34, 60, 0.08);
      font-size: 18px;
      font-weight: 780;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #f5b731;
      box-shadow: 0 0 0 6px rgba(245, 183, 49, 0.18);
    }
    .device-stage {
      position: absolute;
      inset: 0;
      z-index: 2;
    }
    .laptop {
      position: absolute;
      width: var(--w);
      left: var(--x);
      top: var(--y);
      filter: drop-shadow(0 36px 60px rgba(8, 34, 60, 0.18));
    }
    .laptop-screen {
      width: 100%;
      height: calc(var(--w) * 0.58);
      padding: 22px;
      border-radius: 34px;
      background: #10253d;
      box-shadow: inset 0 0 0 6px #0c1d31;
    }
    .laptop-window {
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 20px;
      background: #fff;
      border: 1px solid rgba(255,255,255,0.14);
    }
    .laptop-window img,
    .phone-window img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }
    .laptop-base {
      width: 78%;
      height: 40px;
      margin: 0 auto;
      border-radius: 0 0 30px 30px;
      background: #cdd9e3;
      position: relative;
    }
    .laptop-base::before {
      content: "";
      position: absolute;
      left: 42%;
      top: 8px;
      width: 16%;
      height: 10px;
      border-radius: 999px;
      background: #aab9c5;
    }
    .laptop-base::after {
      content: "";
      position: absolute;
      left: 14%;
      right: 14%;
      bottom: -16px;
      height: 18px;
      border-radius: 999px;
      background: #b8c7d3;
    }
    .phone {
      position: absolute;
      width: var(--w);
      left: var(--x);
      top: var(--y);
      filter: drop-shadow(0 34px 52px rgba(8, 34, 60, 0.22));
    }
    .phone-frame {
      width: 100%;
      aspect-ratio: 390 / 844;
      padding: 15px;
      border-radius: 48px;
      background: #10253d;
      box-shadow: inset 0 0 0 5px #0c1d31;
      position: relative;
    }
    .phone-frame::before {
      content: "";
      position: absolute;
      top: 13px;
      left: 50%;
      transform: translateX(-50%);
      width: 104px;
      height: 20px;
      border-radius: 0 0 16px 16px;
      background: #10253d;
      z-index: 3;
    }
    .phone-window {
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 36px;
      background: #fff;
    }
    .home-laptop { --x: 690px; --y: 164px; --w: 1020px; }
    .home-phone { --x: 1330px; --y: 298px; --w: 342px; }
    .chat-laptop { --x: 760px; --y: 260px; --w: 1000px; }
    .chat-phone { --x: 580px; --y: 420px; --w: 300px; }
    .booking-laptop { --x: 645px; --y: 238px; --w: 1120px; }
    .booking-phone { --x: 1356px; --y: 304px; --w: 326px; }
    .conversation .copy,
    .booking .copy {
      top: 150px;
      width: 540px;
    }
    .conversation h1,
    .booking h1 {
      font-size: 70px;
    }
    .conversation p,
    .booking p {
      width: 500px;
    }
  </style>
</head>
<body>
  <main class="canvas ${variant.theme}">
    <div class="topline">
      <img class="logo" src="${sourceUrls.logo}" alt="">
      <span>Baha Buddy</span>
    </div>
    <section class="copy">
      <div class="eyebrow">${escapeHtml(variant.eyebrow)}</div>
      <h1>${escapeHtml(variant.title)}</h1>
      <p>${escapeHtml(variant.body)}</p>
      <div class="note"><span class="dot"></span>${escapeHtml(variant.note)}</div>
    </section>
    <section class="device-stage" aria-hidden="true">
      <div class="laptop ${variant.laptopClass}">
        <div class="laptop-screen">
          <div class="laptop-window">
            <img src="${sourceUrls[sourceKeyFor(variant.laptop)]}" alt="">
          </div>
        </div>
        <div class="laptop-base"></div>
      </div>
      <div class="phone ${variant.phoneClass}">
        <div class="phone-frame">
          <div class="phone-window">
            <img src="${sourceUrls[sourceKeyFor(variant.phone)]}" alt="">
          </div>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`
}

function sourceKeyFor(filePath) {
  const entry = Object.entries(sources).find(([, sourcePath]) => sourcePath === filePath)
  if (!entry) throw new Error(`Unknown source path: ${filePath}`)
  return entry[0]
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
