import { NextResponse } from 'next/server'

// Serves Google Maps config to client components.
// The key is not committed or bundled with NEXT_PUBLIC_*, but it is still a
// browser Google Maps key and must be restricted by HTTP referrer in Google Cloud.
// GOOGLE_MAPS_MAP_ID is optional and enables Google Cloud map styling.
export async function GET() {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? null
  const mapId = process.env.GOOGLE_MAPS_MAP_ID ?? null

  return NextResponse.json({ key, mapId }, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
