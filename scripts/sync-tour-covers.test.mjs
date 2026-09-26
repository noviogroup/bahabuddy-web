import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCoverPlan, syncTourCovers } from './sync-tour-covers.mjs'

const bytes = Buffer.from('89504e470d0a1a0a', 'hex')
const manifest = { base_id: 'appTest', table_id: 'tblTest', attachment_field_id: 'fldImage', records: [{ record_id: 'recTour', attachment_id: 'attCover', filename: 'nassau-ai-illustration.png' }] }
const attachment = { id: 'attCover', filename: 'nassau-ai-illustration.png', type: 'image/png', size: bytes.length, url: 'https://v5.airtableusercontent.com/cover' }
const records = [{ id: 'recTour', fields: { fldImage: [attachment] } }]
const tours = [{ id: 'uuid-tour', airtable_id: 'recTour', cover_image_url: null, is_active: true }]

test('matches exact Airtable identity, not island or similar title', () => {
  assert.equal(buildCoverPlan(manifest, records, tours)[0].tourId, 'uuid-tour')
  assert.throws(() => buildCoverPlan(manifest, records, [{ ...tours[0], airtable_id: 'recDifferent' }]), /Expected one/)
  assert.throws(() => buildCoverPlan(manifest, records, [...tours, ...tours]), /Expected one/)
})

test('changed attachment and untrusted download URLs stop the import', () => {
  assert.throws(() => buildCoverPlan(manifest, [{ id: 'recTour', fields: { fldImage: [{ ...attachment, id: 'attDifferent' }] } }], tours), /changed or missing/)
  assert.throws(() => buildCoverPlan(manifest, [{ id: 'recTour', fields: { fldImage: [{ ...attachment, url: 'https://attacker.test/file' }] } }], tours), /Airtable attachment/)
})

function fixture({ existing = null, publicBucket = true, conflict = false, badPublicImage = false } = {}) {
  const updates = [], uploads = [], filters = []
  const url = 'https://example.supabase.co/storage/v1/object/public/island-images/cover.png'
  const client = {
    storage: {
      getBucket: async () => ({ data: { public: publicBucket } }),
      from: () => ({
        upload: async (...args) => { uploads.push(args); return {} },
        getPublicUrl: () => ({ data: { publicUrl: url } }),
      }),
    },
    from(table) {
      assert.equal(table, 'self_tours')
      return {
        select: () => ({ in: async () => ({ data: [{ ...tours[0], cover_image_url: existing }] }) }),
        update(value) {
          updates.push(value)
          const chain = {
            eq(key, value) { filters.push([key, value]); return chain },
            is(key, value) { filters.push([key, value]); return chain },
            select: async () => ({ data: conflict ? [] : [{ id: 'uuid-tour', cover_image_url: url }] }),
          }
          return chain
        },
      }
    },
  }
  const fetcher = async (input) => {
    if (input.startsWith('https://api.airtable.com/')) return Response.json({ records })
    if (input === attachment.url) return new Response(bytes)
    if (input === url) return new Response(badPublicImage ? 'not the cover' : bytes)
    throw new Error('Unexpected fetch')
  }
  return { client, fetcher, uploads, updates, filters }
}

test('dry run writes neither Storage nor database', async () => {
  const f = fixture()
  const result = await syncTourCovers({ ...f, manifest, airtableToken: 'test', report: () => {} })
  assert.deepEqual(result, { planned: 1, updated: 0 })
  assert.equal(f.uploads.length + f.updates.length, 0)
})

test('apply verifies the image and updates only the exact empty cover field', async () => {
  const f = fixture()
  await syncTourCovers({ ...f, manifest, airtableToken: 'test', apply: true, report: () => {} })
  assert.deepEqual(Object.keys(f.updates[0]), ['cover_image_url'])
  assert.deepEqual(f.filters, [['id', 'uuid-tour'], ['airtable_id', 'recTour'], ['cover_image_url', null]])
  assert.equal(f.uploads[0][2].upsert, false)
  assert.equal(f.uploads[0][2].metadata.artwork_kind, 'ai_illustration')
})

test('existing different cover aborts before upload', async () => {
  const f = fixture({ existing: 'https://approved.test/photo.jpg' })
  await assert.rejects(syncTourCovers({ ...f, manifest, airtableToken: 'test', apply: true, report: () => {} }), /Existing cover differs/)
  assert.equal(f.uploads.length + f.updates.length, 0)
})

test('failed public verification never updates a tour', async () => {
  const f = fixture({ badPublicImage: true })
  await assert.rejects(syncTourCovers({ ...f, manifest, airtableToken: 'test', apply: true, report: () => {} }), /verification failed/)
  assert.equal(f.updates.length, 0)
})

test('a concurrent cover edit is reported as a conflict', async () => {
  const f = fixture({ conflict: true })
  await assert.rejects(syncTourCovers({ ...f, manifest, airtableToken: 'test', apply: true, report: () => {} }), /update conflict/)
})

test('private bucket is never made public automatically', async () => {
  const f = fixture({ publicBucket: false })
  await assert.rejects(syncTourCovers({ ...f, manifest, airtableToken: 'test', apply: true, report: () => {} }), /public island-images bucket/)
  assert.equal(f.uploads.length + f.updates.length, 0)
})
