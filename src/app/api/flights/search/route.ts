import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchFlights } from '@/lib/chat-tools'

/**
 * POST /api/flights/search — direct (non-chat) Duffel flight search.
 *
 * Same code path as the chat tool `search_flights` — we just call the
 * exported `searchFlights` executor with the same arg shape. This
 * guarantees behaviour parity: bug fixes to Duffel handling benefit
 * both surfaces.
 *
 * Auth: required. The (dashboard) layout already gates the UI, this
 * is belt + suspenders so a stolen token can't be used anonymously.
 *
 * Body shape:
 *   {
 *     origin_city:    string,   // city name or 3-letter IATA
 *     destination:    string,   // one of NAS/EXU/ELH/FPO/GHB/BIM/ASD/MHH
 *     departure_date: string,   // YYYY-MM-DD
 *     return_date?:   string,   // YYYY-MM-DD (omit for one-way)
 *     passengers?:    number,   // default 1
 *     cabin_class?:   string,   // economy | premium_economy | business | first
 *   }
 *
 * Response shape (success):
 *   { results: [...flights], count, cards: [...FlightCard data] }
 *
 * Response shape (graceful failure — Duffel down, no offers, etc.):
 *   { results: [], message: string }   // user-friendly
 *   { results: [], error:   string }   // technical
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

  // Minimal request shape validation. The executor itself handles deeper
  // validation (airport code resolution, Duffel error mapping, etc).
  if (!body.origin_city || typeof body.origin_city !== 'string') {
    return NextResponse.json(
      { error: 'origin_city is required' },
      { status: 400 },
    )
  }
  if (!body.destination || typeof body.destination !== 'string') {
    return NextResponse.json(
      { error: 'destination is required' },
      { status: 400 },
    )
  }
  if (!body.departure_date || typeof body.departure_date !== 'string') {
    return NextResponse.json(
      { error: 'departure_date is required' },
      { status: 400 },
    )
  }

  // Light departure-date sanity: must parse and be today-or-later. Lets
  // through bad timezone edge cases (Duffel will reject anyway).
  const dep = new Date(body.departure_date)
  if (Number.isNaN(dep.getTime())) {
    return NextResponse.json(
      { error: 'departure_date is not a valid date' },
      { status: 400 },
    )
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dep < today) {
    return NextResponse.json(
      { error: 'departure_date must be today or in the future' },
      { status: 400 },
    )
  }

  // Return date, if given, must be after departure.
  if (body.return_date) {
    const ret = new Date(body.return_date as string)
    if (Number.isNaN(ret.getTime())) {
      return NextResponse.json(
        { error: 'return_date is not a valid date' },
        { status: 400 },
      )
    }
    if (ret < dep) {
      return NextResponse.json(
        { error: 'return_date must be on or after departure_date' },
        { status: 400 },
      )
    }
  }

  const result = await searchFlights(body)

  // The executor returns { data, cards? } — flatten for the client.
  const data = (result.data ?? {}) as Record<string, unknown>
  return NextResponse.json({
    ...data,
    cards: result.cards ?? [],
  })
}
