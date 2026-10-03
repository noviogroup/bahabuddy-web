import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cookie-free, anonymous Supabase client for PUBLIC catalog reads
 * (hotels, islands, places, deals, reviews, approved activities, tours,
 * top picks, ...).
 *
 * Why this exists: `@/lib/supabase/server` calls `cookies()`, and in
 * Next 14 any cookies() access during render opts the whole route into
 * request-time rendering, so `export const revalidate = N` and
 * generateStaticParams silently stop working. It also cannot be used inside
 * `unstable_cache` (Next throws when cookies() is read in a cache callback).
 *
 * This client never reads the session, so it is safe for ISR, static
 * generation and `unstable_cache`. It uses the anon key, so every read is
 * still governed by the public RLS policies on those tables.
 *
 * Do NOT use it for anything user-scoped (trips, bookings, profiles): use
 * the cookie client in `@/lib/supabase/server` for those.
 */
let cachedClient: SupabaseClient | null = null

export function createPublicClient(): SupabaseClient {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for public catalog reads',
    )
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return cachedClient
}
