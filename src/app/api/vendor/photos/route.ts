import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanText, ensurePartnerPlaceLink, requireActiveVendorAccess } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_PHOTO_TYPES = new Set(['hero', 'gallery', 'room', 'food', 'exterior', 'activity', 'map'])

function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'vendor-photo'
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Multipart form data is required.' }, { status: 400 })

  const requestedPartnerId = cleanText(formData.get('partner_id'), 80)
  const placeId = cleanText(formData.get('place_id'), 80)
  const access = await requireActiveVendorAccess(requestedPartnerId)

  if (!access.ok) {
    return NextResponse.json(
      { error: access.message, code: access.code },
      { status: access.status },
    )
  }

  if (!placeId) return NextResponse.json({ error: 'A linked place_id is required.' }, { status: 400 })

  const ownsPlace = await ensurePartnerPlaceLink(access.membership.partner_id, placeId)
  if (!ownsPlace) return NextResponse.json({ error: 'Place is not linked to this partner.' }, { status: 403 })

  const fileValue = formData.get('file')
  if (
    !fileValue ||
    typeof fileValue === 'string' ||
    typeof (fileValue as File).arrayBuffer !== 'function'
  ) {
    return NextResponse.json({ error: 'A photo file is required.' }, { status: 400 })
  }
  const file = fileValue as File
  if (!ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported image type.' }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Photo must be between 1 byte and 10 MB.' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Vendor portal service unavailable' }, { status: 503 })

  const imageType = cleanText(formData.get('type'), 40) ?? 'gallery'
  const normalizedType = ALLOWED_PHOTO_TYPES.has(imageType) ? imageType : 'gallery'
  const fileName = safeFileName(file.name)
  const storagePath = `vendor/${access.membership.partner_id}/${placeId}/${Date.now()}-${fileName}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from('place-gallery')
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicUrlData } = admin.storage.from('place-gallery').getPublicUrl(storagePath)
  const publicUrl = publicUrlData.publicUrl

  const { data, error } = await admin
    .from('partner_photo_submissions')
    .insert({
      partner_id: access.membership.partner_id,
      place_id: placeId,
      submitted_by: access.user.id,
      submitted_by_email: access.user.email ?? null,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      url: publicUrl,
      alt: cleanText(formData.get('alt'), 240) ?? '',
      type: normalizedType,
      status: 'pending',
    } as never)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ submission: data }, { status: 201 })
}
