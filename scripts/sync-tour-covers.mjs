// Server-side operator command. Dry run is the default; no publication fields are written.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const PROJECT_URL = 'https://cxcfymhoncysyloutvkh.supabase.co'
const BUCKET = 'island-images'
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

export function buildCoverPlan(manifest, records, tours) {
  const seen = new Set()
  return manifest.records.map((expected) => {
    if (seen.has(expected.record_id)) throw new Error('Duplicate Airtable record in manifest')
    seen.add(expected.record_id)
    const matching = tours.filter((tour) => tour.airtable_id === expected.record_id)
    if (matching.length !== 1) throw new Error(`Expected one self_tours match for ${expected.record_id}`)
    const record = records.find((candidate) => candidate.id === expected.record_id)
    const attachment = record?.fields?.[manifest.attachment_field_id]?.find((item) => item.id === expected.attachment_id)
    if (!attachment || attachment.filename !== expected.filename || attachment.type !== 'image/png') {
      throw new Error(`Verified cover changed or missing for ${expected.record_id}`)
    }
    if (!(attachment.size > 0 && attachment.size <= MAX_IMAGE_BYTES)) throw new Error('Invalid cover size')
    const url = new URL(attachment.url)
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.airtableusercontent.com') || url.username || url.password) {
      throw new Error('Cover must use an Airtable attachment download URL')
    }
    return {
      tourId: matching[0].id,
      airtableId: expected.record_id,
      previousUrl: matching[0].cover_image_url,
      attachment,
    }
  })
}

async function downloadCover(attachment, fetcher) {
  const response = await fetcher(attachment.url, { redirect: 'error', signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Cover download failed: HTTP ${response.status}`)
  const chunks = []
  let length = 0
  for await (const chunk of response.body) {
    length += chunk.length
    if (length > MAX_IMAGE_BYTES) throw new Error('Cover exceeds maximum size')
    chunks.push(Buffer.from(chunk))
  }
  const bytes = Buffer.concat(chunks)
  if (bytes.length !== attachment.size || !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    throw new Error('Cover content does not match the PNG attachment')
  }
  return bytes
}

export async function syncTourCovers({ client, manifest, airtableToken, apply = false, fetcher = fetch, report = console.log }) {
  const { data: bucket, error: bucketError } = await client.storage.getBucket(BUCKET)
  if (bucketError || !bucket?.public) throw new Error('Existing public island-images bucket is required')
  const { data: tours, error } = await client.from('self_tours')
    .select('id,airtable_id,cover_image_url')
    .in('airtable_id', manifest.records.map((record) => record.record_id))
  if (error) throw new Error('Could not read self_tours')

  const params = new URLSearchParams({ returnFieldsByFieldId: 'true', pageSize: '100' })
  params.set('filterByFormula', `OR(${manifest.records.map((record) => `RECORD_ID()='${record.record_id}'`).join(',')})`)
  params.append('fields[]', manifest.attachment_field_id)
  const response = await fetcher(`https://api.airtable.com/v0/${manifest.base_id}/${manifest.table_id}?${params}`, {
    headers: { Authorization: `Bearer ${airtableToken}` }, signal: AbortSignal.timeout(30000), redirect: 'error',
  })
  if (!response.ok) throw new Error(`Airtable read failed: HTTP ${response.status}`)
  const payload = await response.json()
  if (payload.offset) throw new Error('Unexpected paginated cover manifest')
  const plan = buildCoverPlan(manifest, payload.records ?? [], tours ?? [])
  report({ mode: apply ? 'apply' : 'dry-run', records: plan.map(({ airtableId, previousUrl }) => ({ airtableId, hasExistingCover: Boolean(previousUrl) })) })
  if (!apply) return { planned: plan.length, updated: 0 }

  // Download/validate every attachment before beginning writes.
  const prepared = []
  for (const item of plan) {
    const bytes = await downloadCover(item.attachment, fetcher)
    const path = `tour-covers/${item.airtableId}/${hash(bytes)}/${item.attachment.filename}`
    const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(path)
    if (item.previousUrl && item.previousUrl !== publicUrl) {
      throw new Error(`Existing cover differs for ${item.airtableId}; review before replacement`)
    }
    prepared.push({ ...item, bytes, path, publicUrl })
  }

  let updated = 0
  for (const item of prepared) {
    const storage = client.storage.from(BUCKET)
    const { error: uploadError } = await storage.upload(item.path, item.bytes, {
      contentType: 'image/png', cacheControl: '31536000', upsert: false,
      metadata: { artwork_kind: 'ai_illustration', airtable_record_id: item.airtableId, airtable_attachment_id: item.attachment.id },
    })
    // A previous interrupted run can have uploaded this exact content-addressed object.
    if (uploadError && !['409', '400'].includes(String(uploadError.statusCode))) throw new Error(`Cover upload failed for ${item.airtableId}`)
    const verification = await fetcher(item.publicUrl, { redirect: 'error', signal: AbortSignal.timeout(30000) })
    if (!verification.ok || hash(Buffer.from(await verification.arrayBuffer())) !== hash(item.bytes)) {
      throw new Error(`Public cover verification failed for ${item.airtableId}`)
    }
    if (item.previousUrl === item.publicUrl) continue
    const { data: changed, error: updateError } = await client.from('self_tours')
      .update({ cover_image_url: item.publicUrl })
      .eq('id', item.tourId).eq('airtable_id', item.airtableId).is('cover_image_url', null)
      .select('id,cover_image_url')
    if (updateError || changed?.length !== 1 || changed[0].cover_image_url !== item.publicUrl) {
      throw new Error(`Cover update conflict for ${item.airtableId}; no publication fields were changed`)
    }
    updated++
    report({ airtableId: item.airtableId, verified: true })
  }
  return { planned: plan.length, updated }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('node scripts/sync-tour-covers.mjs [--apply]\nRequires server-only AIRTABLE_API_KEY (or AIRTABLE_TOKEN) and SUPABASE_SERVICE_ROLE_KEY. Defaults to read-only dry run. Updates only self_tours.cover_image_url for the 12 verified attachments.')
    return
  }
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Unknown option; use --help')
  const airtableToken = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!airtableToken || !key) throw new Error('Missing server-side credentials; use --help. Never put secrets in NEXT_PUBLIC variables.')
  const manifest = JSON.parse(await readFile(new URL('./data/tour-cover-attachments.json', import.meta.url), 'utf8'))
  const client = createClient(PROJECT_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
  console.log(await syncTourCovers({ client, manifest, airtableToken, apply: process.argv.includes('--apply') }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
