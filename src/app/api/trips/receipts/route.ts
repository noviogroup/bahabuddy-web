import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'trip-receipts'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']

// GET /api/trips/receipts?tripId=xxx — list receipts for a trip
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tripId = req.nextUrl.searchParams.get('tripId')
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 })

  // Verify ownership
  const { data: trip } = await supabase.from('trips').select('user_id').eq('id', tripId).single()
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${tripId}/receipts`, { sortBy: { column: 'created_at', order: 'desc' } })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const files = (data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder')
  const receipts = await Promise.all(
    files.map(async (f) => {
      const path = `${tripId}/receipts/${f.name}`
      const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
      return {
        name: f.name,
        path,
        size: f.metadata?.size ?? 0,
        createdAt: f.created_at,
        mimeType: f.metadata?.mimetype ?? '',
        url: urlData?.signedUrl ?? null,
      }
    })
  )

  return NextResponse.json({ receipts })
}

// POST /api/trips/receipts — upload a receipt (multipart form, field=file, field=tripId)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const tripId = formData.get('tripId')?.toString()
  const file = formData.get('file') as File | null

  if (!tripId || !file) return NextResponse.json({ error: 'tripId and file required' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })

  // Verify ownership
  const { data: trip } = await supabase.from('trips').select('user_id').eq('id', tripId).single()
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)}`
  const path = `${tripId}/receipts/${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void ext // suppress unused warning
  return NextResponse.json({ path, name: safeName })
}

// DELETE /api/trips/receipts?tripId=xxx&path=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tripId = req.nextUrl.searchParams.get('tripId')
  const path = req.nextUrl.searchParams.get('path')
  if (!tripId || !path) return NextResponse.json({ error: 'tripId and path required' }, { status: 400 })

  // Ensure the path belongs to this trip
  if (!path.startsWith(`${tripId}/receipts/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify ownership
  const { data: trip } = await supabase.from('trips').select('user_id').eq('id', tripId).single()
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
