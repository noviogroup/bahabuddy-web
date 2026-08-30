#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const repoRoot = path.resolve(process.cwd(), '..')
const sourceDir = path.join(repoRoot, 'docs', 'marketing', 'mockups', 'source-shots', '2026-06-25-user-selected')
const outputDir = path.join(repoRoot, 'docs', 'marketing', 'mockups', '2026-06-25-user-selected')

const sources = {
  logo: path.join(repoRoot, 'bahabuddy-web', 'public', 'brand', 'logo.png'),
  webJunkanoo: path.join(sourceDir, 'web-junkanoo-home.png'),
  webEleuthera: path.join(sourceDir, 'web-eleuthera-home.png'),
  mobileHome: path.join(sourceDir, 'mobile-home-fixed.png'),
}

await assertSourcesExist()
await fs.mkdir(outputDir, { recursive: true })
const sourceUrls = await buildSourceUrls()

const variants = [
  {
    file: '01-take-the-bahamas-with-you.png',
    theme: 'blue',
    eyebrow: 'BAHA BUDDY',
    title: 'Take the Bahamas with you.',
    body: "Tell Buddy what you're thinking, and he will plan the Bahamas trip around it.",
    note: 'Web planning plus mobile trip companion',
    laptop: 'webJunkanoo',
    phone: 'mobileHome',
    laptopClass: 'laptop-a',
    phoneClass: 'phone-a',
  },
  {
    file: '02-plan-book-travel.png',
    theme: 'aqua',
    eyebrow: 'PLAN, BOOK, TRAVEL',
    title: 'One Bahamas plan across every screen.',
    body: 'Browse stays, compare flights, explore islands, and keep the plan with Buddy.',
    note: 'Built for travelers before and during the trip',
    laptop: 'webEleuthera',
    phone: 'mobileHome',
    laptopClass: 'laptop-b',
    phoneClass: 'phone-b',
  },
  {
    file: '03-bahamas-depth-buddy-simple.png',
    theme: 'white',
    eyebrow: 'BAHAMAS-ONLY AI',
    title: 'Bahamas depth. Buddy simplicity.',
    body: 'A local-feeling travel companion that turns web discovery into an itinerary you can carry.',
    note: 'Islands, stays, flights, food, tours',
    laptop: 'webJunkanoo',
    laptopAlt: 'webEleuthera',
    phone: 'mobileHome',
    laptopClass: 'laptop-c',
    phoneClass: 'phone-c',
  },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
})

for (const variant of variants) {
  await page.setContent(renderHtml(variant), { waitUntil: 'load' })
  await waitForImages(page)
  await page.screenshot({ path: path.join(outputDir, variant.file) })
}

await browser.close()

console.log(
  JSON.stringify(
    {
      outputDir,
      sources,
      files: variants.map((variant) => path.join(outputDir, variant.file)),
    },
    null,
    2,
  ),
)

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
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.svg') return 'image/svg+xml'
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
  const secondLaptop = variant.laptopAlt
    ? `<div class="laptop laptop-alt">
        <div class="laptop-screen"><div class="laptop-window"><img src="${sourceUrls[variant.laptopAlt]}" alt=""></div></div>
        <div class="laptop-base"></div>
      </div>`
    : ''

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
        linear-gradient(90deg, rgba(255,255,255,0.97) 0 38%, rgba(231,249,255,0.92) 38% 100%),
        #f7fbff;
    }
    .canvas.aqua {
      background:
        linear-gradient(90deg, rgba(255,255,255,0.98) 0 37%, rgba(226,249,252,0.92) 37% 100%),
        #f8fcff;
    }
    .canvas.white {
      background:
        linear-gradient(90deg, #ffffff 0 35%, #edf9ff 35% 100%),
        #ffffff;
    }
    .topline {
      position: absolute;
      left: 104px;
      top: 72px;
      display: flex;
      align-items: center;
      gap: 18px;
      font-size: 28px;
      font-weight: 780;
      color: #10253d;
      z-index: 4;
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
      top: 190px;
      width: 560px;
      z-index: 4;
    }
    .eyebrow {
      color: #2579ce;
      font-size: 22px;
      line-height: 1;
      font-weight: 850;
      margin-bottom: 30px;
    }
    h1 {
      margin: 0;
      color: #08223c;
      font-size: 72px;
      line-height: 0.99;
      font-weight: 880;
      letter-spacing: 0;
    }
    p {
      width: 500px;
      margin: 30px 0 0;
      color: #5c7085;
      font-size: 27px;
      line-height: 1.34;
      font-weight: 540;
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
      background: rgba(255,255,255,0.88);
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
    .devices {
      position: absolute;
      inset: 0;
      z-index: 3;
    }
    .laptop {
      position: absolute;
      width: var(--w);
      left: var(--x);
      top: var(--y);
      filter: drop-shadow(0 36px 64px rgba(8, 34, 60, 0.22));
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
    .laptop-base {
      position: relative;
      width: 78%;
      height: 40px;
      margin: 0 auto;
      border-radius: 0 0 30px 30px;
      background: #cdd9e3;
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
      filter: drop-shadow(0 34px 54px rgba(8, 34, 60, 0.24));
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
      z-index: 5;
    }
    .phone-window {
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 36px;
      background: #fff;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }
    .laptop-a { --x: 690px; --y: 158px; --w: 1040px; }
    .phone-a { --x: 1356px; --y: 302px; --w: 324px; }
    .laptop-b { --x: 650px; --y: 164px; --w: 1070px; }
    .phone-b { --x: 1326px; --y: 294px; --w: 330px; }
    .laptop-c { --x: 765px; --y: 330px; --w: 890px; }
    .laptop-alt {
      --x: 720px;
      --y: 112px;
      --w: 760px;
      z-index: 0;
      opacity: 0.86;
      filter: drop-shadow(0 24px 46px rgba(8, 34, 60, 0.14));
    }
    .phone-c { --x: 1376px; --y: 260px; --w: 320px; }
    .canvas.white .copy {
      top: 160px;
      width: 500px;
    }
    .canvas.white h1 {
      font-size: 60px;
    }
    .canvas.white p {
      width: 460px;
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
    <section class="devices" aria-hidden="true">
      ${secondLaptop}
      <div class="laptop ${variant.laptopClass}">
        <div class="laptop-screen"><div class="laptop-window"><img src="${sourceUrls[variant.laptop]}" alt=""></div></div>
        <div class="laptop-base"></div>
      </div>
      <div class="phone ${variant.phoneClass}">
        <div class="phone-frame"><div class="phone-window"><img src="${sourceUrls[variant.phone]}" alt=""></div></div>
      </div>
    </section>
  </main>
</body>
</html>`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
