#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createClient} from '@supabase/supabase-js'

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}

const here = path.dirname(fileURLToPath(import.meta.url))
loadEnv(path.resolve(here, '../.env.local'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anonKey || !serviceKey) {
  throw new Error('Supabase URL, anon key, and service role key are required')
}

const admin = createClient(url, serviceKey, {
  auth: {autoRefreshToken: false, persistSession: false},
})
const correlationId = crypto.randomUUID()
const email = `grounded-chat-smoke-${Date.now()}@example.invalid`
const password = `Smoke-${crypto.randomBytes(18).toString('base64url')}`
let userId
let threadId

async function cleanup() {
  if (correlationId) {
    await admin.from('ai_response_traces').delete().eq('correlation_id', correlationId)
  }
  if (threadId) {
    await admin.from('chat_messages').delete().eq('thread_id', threadId)
    await admin.from('chat_threads').delete().eq('id', threadId)
  }
  if (userId) {
    await admin.from('users').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
  }
}

try {
  const {data: created, error: createError} = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) throw createError ?? new Error('User creation failed')
  userId = created.user.id

  const {error: profileError} = await admin.from('users').upsert({
    id: userId,
    display_name: 'Grounded chat smoke',
    email,
    onboarding_completed: true,
  }, {onConflict: 'id'})
  if (profileError) throw profileError

  const {data: thread, error: threadError} = await admin.from('chat_threads')
    .insert({user_id: userId, title: 'Grounded destination smoke'})
    .select('id')
    .single()
  if (threadError || !thread) throw threadError ?? new Error('Thread creation failed')
  threadId = thread.id

  const userClient = createClient(url, anonKey, {
    auth: {autoRefreshToken: false, persistSession: false},
  })
  const {data: session, error: signInError} = await userClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError || !session.session?.access_token) {
    throw signInError ?? new Error('Sign-in failed')
  }

  const response = await fetch(`${url}/functions/v1/claude-chat-proxy`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${session.session.access_token}`,
      'content-type': 'application/json',
      'x-request-id': correlationId,
    },
    body: JSON.stringify({
      message: "Using only approved destination knowledge, tell me one verified fact about Dean's Blue Hole and which island it is on.",
      thread_id: threadId,
      stream: false,
      correlation_id: correlationId,
    }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`Chat smoke failed with HTTP ${response.status}`)
  const content = String(body.content ?? '')
  if (!/long island/i.test(content) || /exuma/i.test(content)) {
    throw new Error('Grounded answer did not preserve the Dean\'s Blue Hole island boundary')
  }

  const {data: trace, error: traceError} = await admin
    .from('ai_response_traces')
    .select('answer_status,requested_island_slug,tool_names,knowledge_ids,source_ids,content_version:knowledge_version,retrieval_count,stale_content_blocked')
    .eq('correlation_id', correlationId)
    .single()
  if (traceError || !trace) throw traceError ?? new Error('Grounding trace missing')
  if (trace.answer_status !== 'grounded' || trace.retrieval_count < 1) {
    throw new Error(`Grounding trace did not record a successful retrieval: ${JSON.stringify({
      answerStatus: trace.answer_status,
      requestedIslandSlug: trace.requested_island_slug,
      toolNames: trace.tool_names,
      retrievalCount: trace.retrieval_count,
      responsePreview: content.slice(0, 300),
    })}`)
  }
  if (!trace.tool_names?.includes('get_destination_context')) {
    throw new Error('Destination context tool was not recorded')
  }
  if (!trace.knowledge_ids?.length || !trace.source_ids?.length || !trace.content_version) {
    throw new Error('Grounding trace lacks knowledge, source, or content version provenance')
  }
  if (trace.stale_content_blocked) throw new Error('Smoke unexpectedly encountered stale content')

  console.log(JSON.stringify({
    status: 'passed',
    httpStatus: response.status,
    answerStatus: trace.answer_status,
    requestedIslandSlug: trace.requested_island_slug,
    retrievalCount: trace.retrieval_count,
    knowledgeIds: trace.knowledge_ids.length,
    sourceIds: trace.source_ids.length,
    contentVersionRecorded: Boolean(trace.content_version),
    responseMentionsLongIsland: true,
    responseMentionsExuma: false,
  }, null, 2))
} finally {
  await cleanup()
}
