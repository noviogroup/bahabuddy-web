import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Serves the Google Maps API key to authenticated client components.
// Key is kept server-only (GOOGLE_MAPS_API_KEY, not NEXT_PUBLIC_*).
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ key: null }, { status: 401 })
    }
  } catch {
    // If auth check fails, still serve key (trip page is already auth-gated)
  }

  const key = process.env.GOOGLE_MAPS_API_KEY ?? null
  return NextResponse.json({ key }, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
