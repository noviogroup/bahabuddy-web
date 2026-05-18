import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHotels } from '@/lib/chat-tools'

/**
 * POST /api/hotels/search — direct (non-chat) hotel search.
 *
 * Same code path as the chat tool `get_hotels` — call the exported
 * `getHotels` executor with the same arg shape. Behaviour parity with
 * chat is guaranteed.
 *
 * Current data source: `google_places` filtered by type=lodging
 * (decision §1 in chat-tools.ts). Will swap to LiteAPI when a web-side
 * hotels-stays-proxy ships — at that point check_in/check_out dates
 * become real inputs.
 *
 * Auth: required (belt + suspenders alongside (dashboard) layout gate).
 *
 * Body shape:
 *   {
 *     island_id:   string,    // 'nassau' | 'paradise-island' | etc.
 *     price_range?: 'budget' | 'moderate' | 'upscale' | 'fine-dining',
 *     min_rating?: number,    // 0-5
 *     limit?:      number,    // default 5, max 10
 *   }
 *
 * Response: { results, count, cards } | { results: [], message }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.island_id || typeof body.island_id !== 'string') {
    return NextResponse.json(
      { error: 'island_id is required' },
      { status: 400 },
    )
  }

  // Optional bounds checks — keep the executor's downstream validation
  // authoritative, just block obviously-bad input.
  if (
    body.min_rating !== undefined &&
    (typeof body.min_rating !== 'number' || body.min_rating < 0 || body.min_rating > 5)
  ) {
    return NextResponse.json(
      { error: 'min_rating must be a number between 0 and 5' },
      { status: 400 },
    )
  }
  if (
    body.limit !== undefined &&
    (typeof body.limit !== 'number' || body.limit < 1 || body.limit > 10)
  ) {
    return NextResponse.json(
      { error: 'limit must be between 1 and 10' },
      { status: 400 },
    )
  }

  const result = await getHotels(supabase, body)

  const data = (result.data ?? {}) as Record<string, unknown>
  return NextResponse.json({
    ...data,
    cards: result.cards ?? [],
  })
}
