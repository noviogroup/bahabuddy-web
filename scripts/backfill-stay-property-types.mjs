#!/usr/bin/env node
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const FALLBACK_TYPE_NAMES = {
  0: 'Not Available',
  201: 'Apartments',
  203: 'Hostels',
  204: 'Hotels',
  205: 'Motels',
  206: 'Resorts',
  207: 'Residences',
  208: 'Bed and breakfasts',
  209: 'Ryokans',
  210: 'Farm stays',
  212: 'Holiday parks',
  213: 'Villas',
  214: 'Campsites',
  215: 'Boats',
  216: 'Guest houses',
  218: 'Inns',
  219: 'Aparthotels',
  220: 'Holiday homes',
  221: 'Lodges',
  222: 'Homestays',
  223: 'Country houses',
  224: 'Luxury tents',
  225: 'Capsule hotels',
  226: 'Love hotels',
  227: 'Riads',
  228: 'Chalets',
  229: 'Condos',
  230: 'Cottages',
  231: 'Economy hotels',
  232: 'Gites',
  233: 'Health resorts',
  234: 'Cruises',
  235: 'Student accommodation',
  243: 'Tree house property',
  247: 'Pension',
  250: 'Private vacation home',
  251: 'Pousada',
  252: 'Country house',
  254: 'Campsite',
  257: 'Cabin',
  258: 'Holiday park',
  262: 'Affittacamere',
  264: 'Hostel/Backpacker accommodation',
  265: 'Houseboat',
  268: 'Ranch',
  271: 'Agritourism property',
  272: 'Mobile home',
  273: 'Safari/Tentalow',
  274: 'All-inclusive property',
  276: 'Castle',
  277: 'Property',
  278: 'Palace',
}

function loadEnv() {
  const env = { ...process.env }
  if (!fs.existsSync('.env.local')) return env

  for (const rawLine of fs.readFileSync('.env.local', 'utf8').split(/\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const index = line.indexOf('=')
    const key = line.slice(0, index)
    const value = line.slice(index + 1).replace(/^["']|["']$/g, '')
    env[key] = env[key] ?? value
  }

  return env
}

function displayTypeName(name) {
  return name === 'property' ? 'Property' : name
}

async function fetchProviderTypeNames(env) {
  const apiKey = env.TRAVEL_BOOKING_API_KEY || env.LITEAPI_API_KEY
  if (!apiKey) return FALLBACK_TYPE_NAMES

  const baseUrl = (env.TRAVEL_BOOKING_API_BASE_URL || 'https://api.liteapi.travel/v3.0').replace(/\/$/, '')
  const authHeader = env.TRAVEL_BOOKING_API_AUTH_HEADER || 'X-API-Key'

  try {
    const response = await fetch(`${baseUrl}/data/hotelTypes`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        [authHeader]: apiKey,
      },
    })
    if (!response.ok) return FALLBACK_TYPE_NAMES

    const json = await response.json()
    const list = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : []
    const providerTypes = Object.fromEntries(
      list
        .filter((item) => Number.isFinite(Number(item?.id)) && typeof item?.name === 'string' && item.name.trim())
        .map((item) => [Number(item.id), displayTypeName(item.name.trim())]),
    )

    return Object.keys(providerTypes).length > 0 ? providerTypes : FALLBACK_TYPE_NAMES
  } catch {
    return FALLBACK_TYPE_NAMES
  }
}

async function countRows(supabase, id, name) {
  const { count, error } = await supabase
    .from('hotels')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('property_type_id', id)
    .or(`property_type_name.is.null,property_type_name.neq.${name.replaceAll(',', '')}`)

  if (error) throw error
  return count ?? 0
}

async function main() {
  const env = loadEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  const write = process.argv.includes('--write')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const typeNames = await fetchProviderTypeNames(env)
  const entries = Object.entries(typeNames)
    .map(([id, name]) => [Number(id), String(name)])
    .filter(([id, name]) => id > 0 && name !== 'Not Available')
    .sort(([a], [b]) => a - b)

  const changed = []
  for (const [id, name] of entries) {
    const pending = await countRows(supabase, id, name)
    if (pending === 0) continue

    if (write) {
      const { data, error } = await supabase
        .from('hotels')
        .update({ property_type_name: name })
        .eq('is_active', true)
        .eq('property_type_id', id)
        .select('id')

      if (error) throw error
      changed.push({ id, name, rows: data?.length ?? pending })
    } else {
      changed.push({ id, name, rows: pending })
    }
  }

  console.log(JSON.stringify({
    mode: write ? 'write' : 'dry-run',
    changed,
    totalRows: changed.reduce((sum, item) => sum + item.rows, 0),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
