#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

const DEFAULT_BASE_URL = 'https://api.liteapi.travel/v3.0'

loadEnvFile('.env.local')

const apiKey = process.env.TRAVEL_BOOKING_API_KEY || process.env.LITEAPI_API_KEY || ''
const baseUrl = stripTrailingSlash(process.env.TRAVEL_BOOKING_API_BASE_URL || DEFAULT_BASE_URL)
const authHeader = process.env.TRAVEL_BOOKING_API_AUTH_HEADER || 'X-API-Key'
const hotelIds = (process.env.LITEAPI_SMOKE_HOTEL_IDS || 'lp22731,lp383da')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .slice(0, 3)

if (!apiKey) {
  console.error('LiteAPI smoke failed: TRAVEL_BOOKING_API_KEY or LITEAPI_API_KEY is missing.')
  process.exit(1)
}

const outboundDate = isoDateFromNow(45)
const checkin = isoDateFromNow(60)
const checkout = isoDateFromNow(64)

const checks = [
  {
    label: 'flight rates MIA to NAS',
    path: '/flights/rates',
    body: {
      legs: [
        {
          origin: 'MIA',
          destination: 'NAS',
          date: outboundDate,
          direction: 'OUTBOUND',
        },
      ],
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: 'ECONOMY',
      currency: 'USD',
      country: 'US',
    },
  },
  {
    label: `hotel rates ${hotelIds.join(', ')}`,
    path: '/hotels/rates',
    body: {
      hotelIds,
      checkin,
      checkout,
      occupancies: [{ adults: 2 }],
      currency: 'USD',
      guestNationality: 'US',
    },
  },
]

let failed = false

for (const check of checks) {
  try {
    const result = await callProvider(check.path, check.body)
    console.log(`PASS ${check.label}: HTTP ${result.status} ${summarize(result.data)}`)
  } catch (error) {
    failed = true
    console.error(`FAIL ${check.label}: ${error.message}`)
    if (error.details) console.error(summarize(error.details))
  }
}

if (failed) process.exit(1)

function loadEnvFile(path) {
  if (!existsSync(path)) return

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue

    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

async function callProvider(path, body) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  headers[authHeader] = authHeader.toLowerCase() === 'authorization'
    ? `Bearer ${apiKey}`
    : apiKey

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const text = await response.text()
  const data = parseJson(text)

  if (!response.ok) {
    const message = providerMessage(data) || `Provider request failed with status ${response.status}.`
    const error = new Error(message)
    error.details = data
    throw error
  }

  return { status: response.status, data }
}

function parseJson(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 500) }
  }
}

function providerMessage(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ''
  return [data.error, data.message, data.detail, data.title]
    .find((value) => typeof value === 'string' && value.trim()) || ''
}

function summarize(data) {
  if (Array.isArray(data)) return `array length=${data.length}`
  if (!data || typeof data !== 'object') return String(data ?? 'empty')

  const record = data
  const dataValue = record.data
  if (Array.isArray(dataValue)) return `data length=${dataValue.length}; keys=${Object.keys(record).slice(0, 8).join(',')}`
  if (dataValue && typeof dataValue === 'object') return `data keys=${Object.keys(dataValue).slice(0, 8).join(',')}`
  return `keys=${Object.keys(record).slice(0, 8).join(',')}`
}

function isoDateFromNow(days) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function stripTrailingSlash(value) {
  return value.replace(/\/$/, '')
}
