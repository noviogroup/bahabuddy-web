import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cookie-free anon client for PUBLIC catalog reads (places, islands, hotels,
 * deals, approved activities, tours). It never reads the request's cookies,
 * so pages that only use it can be statically rendered / ISR-cached.
 *
 * Never use it for data that depends on the signed-in user (trips, owned
 * tours, entitlements, dashboard): use `@/lib/supabase/server` there.
 */
let publicClient: SupabaseClient | null = null

export function createPublicClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
  }
  return publicClient
}
