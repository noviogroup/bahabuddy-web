/**
 * /destinations/[island] — legacy island detail route.
 *
 * Historical context: this was the original Supabase-only marketing
 * island page using a short-slug system (`nassau`, `exumas`,
 * `eleuthera`, `harbour-island`, `andros`, `grand-bahama`). Session 14
 * unified the slug system on mobile-canonical slugs (the same ones
 * `bahamas_attractions.island` and the mobile `ISLANDS` catalog use)
 * and moved the canonical detail page to `/explore/island/[id]`.
 *
 * This route is now a permanent (308) redirect to the canonical URL.
 * Any inbound SEO juice on the legacy URLs is forwarded. Unknown
 * legacy slugs fall back to the destinations listing rather than 404
 * — the listing is a better landing than a dead end.
 *
 * The full rich page that previously lived here has been moved to
 * `/explore/island/[id]/page.tsx` with richer content (Sanity-aware,
 * additional islands, gallery support, etc).
 */

import { permanentRedirect } from 'next/navigation'

/**
 * Map from the legacy short slug to the mobile-canonical slug used by
 * `/explore/island/[id]`. Keep keys for any URL ever rendered by the
 * legacy route so external links still resolve.
 */
const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  nassau: 'nassau-paradise-island',
  exumas: 'the-exumas',
  eleuthera: 'eleuthera-harbour-island',
  'harbour-island': 'harbour-island',
  andros: 'andros',
  'grand-bahama': 'grand-bahama',
}

interface PageProps {
  params: { island: string }
}

/**
 * Pre-render redirect stubs for the 6 legacy URLs at build time so
 * crawlers see immediate 308s instead of having to dynamically resolve.
 */
export function generateStaticParams() {
  return Object.keys(LEGACY_SLUG_REDIRECTS).map(island => ({ island }))
}

export default function LegacyIslandRedirect({ params }: PageProps) {
  const target = LEGACY_SLUG_REDIRECTS[params.island]
  if (target) {
    permanentRedirect(`/explore/island/${target}`)
  }
  // Unknown legacy slug — send to the destinations listing as a
  // graceful fallback rather than 404.
  permanentRedirect('/destinations')
}
