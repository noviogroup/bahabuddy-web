/**
 * Sanity client (C.7) — read-only fetch client for editorial content.
 *
 * Configured from env vars at module load:
 *   - NEXT_PUBLIC_SANITY_PROJECT_ID   (required)
 *   - NEXT_PUBLIC_SANITY_DATASET      (default 'production')
 *   - NEXT_PUBLIC_SANITY_API_VERSION  (default '2024-01-01')
 *
 * Graceful fallback: if NEXT_PUBLIC_SANITY_PROJECT_ID is missing or
 * empty, `isSanityConfigured` is `false`. Callers should check this
 * flag (or call `safeFetch` which returns `null` when not configured)
 * and use a hardcoded fallback. This lets the web app run with or
 * without Sanity — useful during early development before the user
 * has stood up a Sanity project.
 *
 * Use this client from server components only (or via server actions /
 * route handlers). It reads from Sanity's public CDN — no auth token
 * required for published content.
 *
 * Why @sanity/client instead of next-sanity:
 *   We originally imported `createClient` from `next-sanity`. That works
 *   functionally but `next-sanity`'s root barrel re-exports its
 *   VisualEditing client component, which transitively pulls in
 *   `@sanity/ui` → `styled-components`. Next.js's bundler walks the
 *   barrel and tries to resolve every re-export — even the ones we
 *   don't import — and fails the build with "Can't resolve
 *   'styled-components'".
 *
 *   `@sanity/client` is the bare client `next-sanity` wraps. Same
 *   `createClient` signature, same options, zero UI baggage. It's
 *   already in the dep tree as a transitive of `next-sanity`. Swapping
 *   the import sidesteps the Visual Editing chain entirely.
 *
 *   `next-sanity` stays in package.json for now in case we want its
 *   Next.js-specific helpers later (revalidation tag, server-only
 *   fetch utility, etc.) — those don't trigger the styled-components
 *   resolution.
 */

import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''
const dataset   = process.env.NEXT_PUBLIC_SANITY_DATASET   ?? 'production'
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-01-01'

export const isSanityConfigured: boolean = projectId.trim().length > 0

// We infer the client type rather than importing it explicitly —
// avoids version-skew issues where the type re-export shifts between
// `@sanity/client` major versions.
type Client = ReturnType<typeof createClient>

let client: Client | null = null
if (isSanityConfigured) {
  client = createClient({
    projectId,
    dataset,
    apiVersion,
    // useCdn=true gives faster reads and lower egress, but content is
    // ~1 min stale. Fine for editorial content that doesn't need to be
    // real-time.
    useCdn: true,
    perspective: 'published',
  })
}

export { client as sanityClient }

/**
 * Safe wrapper around `sanityClient.fetch()`. Returns null when Sanity
 * isn't configured, or when the fetch fails for any reason. Callers
 * should treat null as "no Sanity content available, use fallback".
 *
 * Type parameter: the expected shape of the result.
 */
export async function safeFetch<T>(query: string, params?: Record<string, unknown>): Promise<T | null> {
  if (!client) return null
  try {
    const result = await client.fetch<T>(query, params ?? {})
    return result ?? null
  } catch (err) {
    console.error('[sanity safeFetch]', err)
    return null
  }
}
