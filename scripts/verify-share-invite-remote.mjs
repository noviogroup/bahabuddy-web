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
const createdInvitationIds = []
const createdShareLinkIds = []

try {
  await cleanupStaleVerifierRows()

  const owner = await createVerifierUser('owner')
  const invitee = await createVerifierUser('invitee')
  const ownerSession = await signInAs(owner.email, password)
  const inviteeSession = await signInAs(invitee.email, password)

  const trip = await expectSingle(
    'owner can create share verifier trip through RLS',
    ownerSession.client
      .from('trips')
      .insert({
        user_id: owner.id,
        name: `Share verifier trip ${runId}`,
        status: 'planned',
        date_start: '2026-08-05',
        date_end: '2026-08-09',
        islands: ['Exuma'],
        party_type: 'friends',
        party_size: 2,
        hero_image_url: 'https://example.invalid/baha-share-verifier.jpg',
      })
      .select('id, user_id, name')
      .single(),
  )
  createdTripIds.push(trip.id)

  await expectSingle(
    'service role can add accommodation with private booking reference',
    admin
      .from('trip_accommodations')
      .insert({
        trip_id: trip.id,
        name: `Verifier Stay ${runId}`,
        island: 'Exuma',
        check_in: '2026-08-05',
        check_out: '2026-08-09',
        price_per_night: 350,
        guests: 2,
        booking_reference: `SECRET-HOTEL-${runId}`,
      })
      .select('id')
      .single(),
  )

  await expectSingle(
    'service role can add flight with private booking reference',
    admin
      .from('trip_flights')
      .insert({
        trip_id: trip.id,
        origin: 'MIA',
        destination: 'GGT',
        airline: 'Bahamasair',
        departure_at: '2026-08-05T14:30:00Z',
        arrival_at: '2026-08-05T16:00:00Z',
        price: 285,
        booking_reference: `SECRET-FLIGHT-${runId}`,
      })
      .select('id')
      .single(),
  )

  await expectSingle(
    'service role can add activity used in public share snapshot',
    admin
      .from('trip_activities')
      .insert({
        trip_id: trip.id,
        day_number: 1,
        time_slot: 'afternoon',
        activity_name: `Verifier beach stop ${runId}`,
        activity_type: 'beach',
        notes: 'Public-safe activity note.',
      })
      .select('id')
      .single(),
  )

  const shareResponse = await callFunction('create-share-link', {
    token: ownerSession.token,
    body: { trip_id: trip.id, share_type: 'link' },
  })
  if (!shareResponse.ok) {
    throw new Error(`create-share-link failed: ${shareResponse.status} ${JSON.stringify(shareResponse.body)}`)
  }
  const share = shareResponse.body
  if (!share.short_code || share.share_type !== 'link') {
    throw new Error(`create-share-link returned invalid payload: ${JSON.stringify(share)}`)
  }
  if (!String(share.url).includes(`/trip/${share.short_code}`)) {
    throw new Error(`create-share-link URL does not use legacy mobile trip short-code path: ${share.url}`)
  }
  console.log('PASS create-share-link returns tracked short-code URL')

  const shareLink = await expectSingle(
    'service role can read created share link for cleanup',
    admin
      .from('share_links')
      .select('id, trip_id, short_code, share_type')
      .eq('short_code', share.short_code)
      .single(),
  )
  createdShareLinkIds.push(shareLink.id)

  const resolvedResponse = await callFunction('resolve-share-link', {
    body: { short_code: share.short_code },
  })
  if (!resolvedResponse.ok) {
    throw new Error(`resolve-share-link failed: ${resolvedResponse.status} ${JSON.stringify(resolvedResponse.body)}`)
  }
  assertPublicShareSnapshot(resolvedResponse.body, owner.email)
  console.log('PASS resolve-share-link returns sanitized public trip snapshot')

  const inviteCode = `bbinv${runId}`
  const invitation = await expectSingle(
    'service role can create pending invitation without sending email',
    admin
      .from('trip_invitations')
      .insert({
        trip_id: trip.id,
        invited_by: owner.id,
        invitee_email: invitee.email,
        role: 'editor',
        status: 'pending',
        short_code: inviteCode,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id, short_code, status')
      .single(),
  )
  createdInvitationIds.push(invitation.id)

  const previewResponse = await callFunction('accept-invite', {
    token: inviteeSession.token,
    body: { short_code: inviteCode, action: 'preview' },
  })
  if (!previewResponse.ok) {
    throw new Error(`accept-invite preview failed: ${previewResponse.status} ${JSON.stringify(previewResponse.body)}`)
  }
  if (
    previewResponse.body.action !== 'preview' ||
    previewResponse.body.trip_id !== trip.id ||
    previewResponse.body.role !== 'editor' ||
    previewResponse.body.already_member !== false
  ) {
    throw new Error(`accept-invite preview returned invalid payload: ${JSON.stringify(previewResponse.body)}`)
  }
  console.log('PASS accept-invite preview resolves pending invitation without writes')

  const acceptResponse = await callFunction('accept-invite', {
    token: inviteeSession.token,
    body: { short_code: inviteCode, action: 'accept' },
  })
  if (!acceptResponse.ok) {
    throw new Error(`accept-invite accept failed: ${acceptResponse.status} ${JSON.stringify(acceptResponse.body)}`)
  }
  if (acceptResponse.body.accepted !== true || acceptResponse.body.already_member !== true) {
    throw new Error(`accept-invite accept returned invalid payload: ${JSON.stringify(acceptResponse.body)}`)
  }
  console.log('PASS accept-invite accept joins invitee to trip')

  await expectSingle(
    'service role can verify accepted collaborator row',
    admin
      .from('trip_collaborators')
      .select('id, trip_id, user_id, role, accepted_at')
      .eq('trip_id', trip.id)
      .eq('user_id', invitee.id)
      .eq('role', 'editor')
      .not('accepted_at', 'is', null)
      .single(),
  )

  const updatedInvite = await expectSingle(
    'service role can verify invitation accepted state',
    admin
      .from('trip_invitations')
      .select('id, status, invitee_user_id, accepted_at')
      .eq('id', invitation.id)
      .single(),
  )
  if (
    updatedInvite.status !== 'accepted' ||
    updatedInvite.invitee_user_id !== invitee.id ||
    !updatedInvite.accepted_at
  ) {
    throw new Error(`invitation did not reconcile accepted state: ${JSON.stringify(updatedInvite)}`)
  }

  const updatedTrip = await expectSingle(
    'service role can verify trip collaborator_ids includes invitee',
    admin
      .from('trips')
      .select('id, collaborator_ids')
      .eq('id', trip.id)
      .single(),
  )
  if (!Array.isArray(updatedTrip.collaborator_ids) || !updatedTrip.collaborator_ids.includes(invitee.id)) {
    throw new Error('trip collaborator_ids did not include accepted invitee')
  }

  console.log('Share and invite remote verification passed.')
} catch (error) {
  console.error(`Share and invite remote verification failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await cleanup()
}

async function createVerifierUser(kind) {
  const email = `bb-share-${kind}-${runId}@example.invalid`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: 'share-invite-verifier', run_id: runId, kind },
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
        display_name: `Share ${kind} ${runId}`,
        email,
        country: 'US',
        city: 'Miami',
        party_type: 'friends',
        party_size: 2,
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

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  })

  return { client, token: data.session.access_token }
}

async function callFunction(name, { token, body }) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let parsed = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = { raw: text }
  }

  return { ok: response.ok, status: response.status, body: parsed }
}

async function expectSingle(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  if (!data) throw new Error(`${label}: expected one row`)
  console.log(`PASS ${label}`)
  return data
}

function assertPublicShareSnapshot(payload, ownerEmail) {
  if (payload.share_type !== 'link') {
    throw new Error(`expected link share_type, got ${payload.share_type}`)
  }
  if (payload.trip?.name !== `Share verifier trip ${runId}`) {
    throw new Error(`resolved trip name mismatch: ${JSON.stringify(payload.trip)}`)
  }
  if (!Array.isArray(payload.accommodations) || payload.accommodations.length !== 1) {
    throw new Error('resolved payload missing public accommodation')
  }
  if (!Array.isArray(payload.flights) || payload.flights.length !== 1) {
    throw new Error('resolved payload missing public flight')
  }
  if (!Array.isArray(payload.activities) || payload.activities.length !== 1) {
    throw new Error('resolved payload missing public activity')
  }

  const serialized = JSON.stringify(payload)
  const blockedTerms = [
    ownerEmail,
    'user_id',
    'booking_reference',
    `SECRET-HOTEL-${runId}`,
    `SECRET-FLIGHT-${runId}`,
    'payment_intent',
    'customer_id',
  ]
  for (const term of blockedTerms) {
    if (serialized.includes(term)) {
      throw new Error(`resolved public share payload leaked sensitive term: ${term}`)
    }
  }
}

async function cleanup() {
  const uniqueInvitationIds = [...new Set(createdInvitationIds)].filter(Boolean)
  if (uniqueInvitationIds.length > 0) {
    await admin.from('trip_invitations').delete().in('id', uniqueInvitationIds)
  }

  const uniqueShareLinkIds = [...new Set(createdShareLinkIds)].filter(Boolean)
  if (uniqueShareLinkIds.length > 0) {
    await admin.from('share_links').delete().in('id', uniqueShareLinkIds)
  }

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
  await admin.from('users').delete().like('email', 'bb-share-%@example.invalid')

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return
    const stale = data.users.filter((user) => user.email?.startsWith('bb-share-') && user.email.endsWith('@example.invalid'))
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
