#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
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

try {
  await cleanupStaleVerifierRows()
  const owner = await createVerifierUser('owner')
  const collaborator = await createVerifierUser('collaborator')
  const ownerClient = await signInAs(owner.email, password)
  const collaboratorClient = await signInAs(collaborator.email, password)

  const trip = await expectSingle(
    'owner can insert own trip',
    ownerClient
      .from('trips')
      .insert({
        user_id: owner.id,
        name: `RLS verifier primary ${runId}`,
        status: 'planned',
        date_start: '2026-07-20',
        date_end: '2026-07-24',
        islands: ['Nassau'],
        party_type: 'solo',
        party_size: 1,
      })
      .select('id, user_id, name')
      .single(),
  )
  createdTripIds.push(trip.id)

  await expectSingle(
    'owner can read own trip',
    ownerClient.from('trips').select('id, user_id, name').eq('id', trip.id).single(),
  )

  await expectSingle(
    'owner can update own trip',
    ownerClient
      .from('trips')
      .update({ name: `RLS verifier updated ${runId}` })
      .eq('id', trip.id)
      .select('id, name')
      .single(),
  )

  await expectNoRows(
    'non-owner cannot read trip by direct id',
    collaboratorClient.from('trips').select('id').eq('id', trip.id),
  )

  await expectNoRows(
    'non-owner cannot update trip by direct id',
    collaboratorClient
      .from('trips')
      .update({ name: `RLS verifier forbidden ${runId}` })
      .eq('id', trip.id)
      .select('id'),
  )

  const serviceTrip = await expectSingle(
    'service role can read trip for admin/support paths',
    admin.from('trips').select('id, name').eq('id', trip.id).single(),
  )
  if (serviceTrip.name !== `RLS verifier updated ${runId}`) {
    throw new Error('non-owner update changed trip despite RLS')
  }

  await expectSingle(
    'owner can add accepted editor collaborator',
    ownerClient
      .from('trip_collaborators')
      .insert({
        trip_id: trip.id,
        user_id: collaborator.id,
        role: 'editor',
        accepted_at: new Date().toISOString(),
      })
      .select('id, trip_id, user_id, role')
      .single(),
  )

  await expectSingle(
    'accepted collaborator can read shared trip',
    collaboratorClient.from('trips').select('id, user_id, name').eq('id', trip.id).single(),
  )

  await expectSingle(
    'editor collaborator can write supported trip activity item',
    collaboratorClient
      .from('trip_activities')
      .insert({
        trip_id: trip.id,
        day_number: 1,
        time_slot: 'morning',
        activity_name: `RLS verifier activity ${runId}`,
        activity_type: 'test',
      })
      .select('id, trip_id')
      .single(),
  )

  const deleteTrip = await expectSingle(
    'owner can insert trip used for delete check',
    ownerClient
      .from('trips')
      .insert({
        user_id: owner.id,
        name: `RLS verifier delete ${runId}`,
        status: 'draft',
        islands: ['Nassau'],
        party_type: 'solo',
        party_size: 1,
      })
      .select('id')
      .single(),
  )
  createdTripIds.push(deleteTrip.id)

  await expectSingle(
    'owner can delete own trip',
    ownerClient.from('trips').delete().eq('id', deleteTrip.id).select('id').single(),
  )
  createdTripIds.splice(createdTripIds.indexOf(deleteTrip.id), 1)

  await expectNoRows(
    'deleted owner trip is gone for service role',
    admin.from('trips').select('id').eq('id', deleteTrip.id),
  )

  console.log('Trips RLS behavioral verification passed.')
} catch (error) {
  console.error(`Trips RLS behavioral verification failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await cleanup()
}

async function createVerifierUser(kind) {
  const email = `bb-rls-${kind}-${runId}@example.invalid`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: 'trips-rls-verifier', run_id: runId, kind },
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
        display_name: `RLS ${kind} ${runId}`,
        email,
        country: 'US',
        city: 'Miami',
        party_type: 'solo',
        party_size: 1,
      }, { onConflict: 'id' })
      .select('id, email')
      .single(),
  )
  createdPublicUserIds.push(profile.id)
  return { id, email }
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

async function expectNoRows(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  if (Array.isArray(data) && data.length === 0) {
    console.log(`PASS ${label}`)
    return
  }
  throw new Error(`${label}: expected zero rows, got ${Array.isArray(data) ? data.length : 'non-array data'}`)
}

async function cleanup() {
  const uniqueTripIds = [...new Set(createdTripIds)].filter(Boolean)
  if (uniqueTripIds.length > 0) {
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
  await admin.from('users').delete().like('email', 'bb-rls-%@example.invalid')
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
