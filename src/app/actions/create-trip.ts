'use server'

/**
 * createTripAction — server action invoked by <CreateTripModal>.
 *
 * Inserts a draft `trips` row scoped to the current user, optionally
 * stamping date_start/date_end and the user's freeform preferences as
 * planning context. Returns the new trip id so the client can open the
 * canonical trip record or, when explicitly requested, start Buddy with
 * that trip context.
 *
 * Auth: relies on the user's Supabase session cookie. If somehow
 * called unauthenticated the action throws — wrapping page is gated
 * by middleware anyway.
 *
 * Imagery: hero_image_url is stamped from `getIslandHeroImage` so
 * the trip detail page renders a real Bahamas photo immediately,
 * not the gradient fallback. This is the imagery-first principle —
 * even a brand-new draft already has a hero.
 *
 * Slug → name → islands[]: the destination passed in is a mobile-
 * canonical island slug (see `island-config.ts`). We resolve to the
 * display name once and store it in islands[]. The slug stays out
 * of trips storage; consumers can re-resolve via name → config when
 * they need it (mostly the trip-detail page).
 */

import { createClient } from '@/lib/supabase/server'
import { getIslandConfig } from '@/lib/island-config'
import { getIslandHero } from '@/lib/islands'

export interface CreateTripInput {
  /** Mobile-canonical island slug (e.g. 'the-exumas'). */
  destinationSlug: string
  /** ISO date strings. Both null = flexible. */
  dateStart: string | null
  dateEnd: string | null
  /** Freeform user notes saved as planning context and optional Buddy seed. */
  preferences: string
}

export interface CreateTripResult {
  ok: boolean
  tripId?: string
  /** Seed message for optional Buddy follow-up. */
  seedQuery?: string
  error?: string
}

export async function createTripAction(
  input: CreateTripInput,
): Promise<CreateTripResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Not signed in' }
  }

  const island = getIslandConfig(input.destinationSlug)
  if (!island) {
    return { ok: false, error: 'Unknown destination' }
  }

  // Build the trip name: "Trip to <Island>" with optional month/year.
  // Matches the conversational tone of MindTrip's "Trip to Andros, May 2026".
  let tripName = `Trip to ${island.name}`
  if (input.dateStart) {
    try {
      const d = new Date(input.dateStart)
      tripName = `Trip to ${island.name}, ${d.toLocaleString('en-US', {
        month: 'long', year: 'numeric',
      })}`
    } catch {
      /* fall through to bare name */
    }
  }

  // Pull hero from the islands table (DB-driven). Falls back through
  // the static map in islands.ts when the DB row is missing, so a
  // brand-new trip always has a real Bahamas photo stamped at
  // creation time — same imagery the explore/island detail page shows.
  const heroImageUrl = await getIslandHero(input.destinationSlug)

  const { data: tripRow, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      name: tripName,
      status: 'draft',
      date_start: input.dateStart,
      date_end: input.dateEnd,
      islands: [island.name],
      hero_image_url: heroImageUrl,
    })
    .select('id')
    .single()

  if (error || !tripRow) {
    console.error('[createTripAction] insert failed', error)
    return { ok: false, error: error?.message ?? 'Failed to create trip' }
  }

  // Build optional Buddy context using the destination and any
  // preferences the user typed. Direct trip creation uses the trip id
  // first; chat only consumes this when the user explicitly chooses
  // the "Create and ask Buddy" path.
  const trimmedPrefs = input.preferences.trim()
  let seedQuery = `I'm planning a trip to ${island.name}`
  if (input.dateStart && input.dateEnd) {
    const start = new Date(input.dateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = new Date(input.dateEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    seedQuery += ` from ${start} to ${end}`
  } else if (input.dateStart) {
    const start = new Date(input.dateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    seedQuery += ` starting ${start}`
  } else {
    seedQuery += ` (dates flexible)`
  }
  seedQuery += '.'
  if (trimmedPrefs) {
    seedQuery += ` ${trimmedPrefs}`
  }
  seedQuery += ' Help me plan it.'

  return {
    ok: true,
    tripId: tripRow.id,
    seedQuery,
  }
}
