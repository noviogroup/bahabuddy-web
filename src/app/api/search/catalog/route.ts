import { NextRequest, NextResponse } from 'next/server'

import {
  cleanCatalogQuery,
  normalizeCatalogResult,
  parseCatalogFilter,
  parseCatalogIsland,
  type CatalogRpcRow,
} from '@/lib/catalog-search'
import { islandDisplayName } from '@/lib/island-config'
import { createClient } from '@/lib/supabase/server'
import { parseTripStyles, rankByTripStyles, type TripStyle } from '@/lib/trip-styles'
import {
  approvedActivityCard,
  approvedActivityDetailHref,
  approvedActivityTypeLabel,
  canonicalAttractionCategory,
  canonicalAttractionPhotos,
  getActivitiesWithCanonicalFallback,
  type CanonicalAttractionRow,
} from '@/lib/approved-activities'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const query = cleanCatalogQuery(request.nextUrl.searchParams.get('q'))
  const filter = parseCatalogFilter(request.nextUrl.searchParams.get('filter'))
  const island = parseCatalogIsland(request.nextUrl.searchParams.get('island'))
  // Optional trip styles (comma-separated slugs); unknown values are dropped.
  const styles = parseTripStyles(request.nextUrl.searchParams.get('styles') ?? '')
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '36', 10)
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(requestedLimit, 48))
    : 36

  if (query.length < 2) {
    return NextResponse.json(
      { query, results: [], count: 0 },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    const supabase = await createClient()
    const { data, error } = await searchCatalog(supabase, { query, filter, island, limit, styles })

    if (error) {
      console.error('[catalog-search] Supabase RPC failed', {
        code: error.code,
        details: error.details,
      })
      return NextResponse.json(
        { error: 'Search is temporarily unavailable. Please try again.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const activityOnly = filter === 'beaches' || filter === 'things_to_do' || filter === 'tours'
    const includeApproved = !filter || activityOnly
    const activityRows = includeApproved
      ? await getActivitiesWithCanonicalFallback(supabase, {
          islandSlug: island,
          category: filter === 'beaches' ? 'beach' : null,
          search: query,
          limit,
        })
      : { approved: [], canonical: [] }
    const approvedRows = filter === 'tours'
      ? activityRows.approved.filter((row) => row.source_layer === 'self_tours' || row.source_layer === 'cruise_itineraries')
      : activityRows.approved
    // Guided tours stay approval-only; other activity searches include real
    // canonical attractions while no reviewed non-tour activity exists.
    const canonicalRows = filter === 'tours'
      ? []
      : rankByTripStyles(activityRows.canonical, styles, (row) => ({
          tripStyles: row.trip_styles,
          priceTier: row.price_tier,
        }))
    const rawRows = ((data ?? []) as CatalogRpcRow[]).filter((row) => !isRawActivityResult(row))
    const approvedCatalogRows: CatalogRpcRow[] = approvedRows.map((row) => {
      const card = approvedActivityCard(row)
      return {
        result_id: row.activity_id,
        result_type: 'attraction',
        title: row.name,
        subtitle: row.description,
        island_slug: row.island_slug,
        island_name: islandDisplayName(row.island_slug),
        category: approvedActivityTypeLabel(row),
        image_url: card.photo_url ?? null,
        rating: null,
        review_count: null,
        price_from_usd: null,
        route_path: approvedActivityDetailHref(row.activity_id),
        source_table: 'v_approved_activity_recommendations',
        score: 100,
        is_live_action: false,
      }
    })
    const results = [
      ...approvedCatalogRows,
      ...canonicalRows.map(canonicalAttractionCatalogRow),
      ...(activityOnly ? [] : rawRows),
    ].slice(0, limit).map(normalizeCatalogResult)
    return NextResponse.json(
      { query, results, count: results.length },
      {
        headers: {
          // Netlify's function cache can collapse query-string variants unless
          // an explicit cache-key strategy is configured. Search responses
          // must never bleed across queries, filters, or island selections.
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    )
  } catch {
    return NextResponse.json(
      { error: 'Search is temporarily unavailable. Please try again.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

type CatalogSearchArgs = {
  query: string
  filter: string | null
  island: string | null
  limit: number
  styles: TripStyle[]
}

/**
 * Calls `search_catalog`, passing `p_trip_styles` only when styles were
 * requested. If the deployed RPC does not accept that argument yet (or the
 * styled call fails for any reason), retries the original 4-argument call so
 * search keeps working unpersonalized.
 */
async function searchCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  { query, filter, island, limit, styles }: CatalogSearchArgs,
) {
  const baseArgs = {
    p_query: query,
    p_filter: filter,
    p_island: island,
    p_limit: limit,
  }
  if (styles.length > 0) {
    const styled = await supabase.rpc('search_catalog', { ...baseArgs, p_trip_styles: styles })
    if (!styled.error) return styled
    console.warn('[catalog-search] trip-style search unavailable; retrying without styles', {
      code: styled.error.code,
    })
  }
  return supabase.rpc('search_catalog', baseArgs)
}

function canonicalAttractionCatalogRow(row: CanonicalAttractionRow): CatalogRpcRow {
  return {
    result_id: row.id,
    result_type: 'attraction',
    title: row.name,
    subtitle: row.short_description ?? row.description,
    island_slug: row.island_id,
    island_name: row.island_name ?? row.island_id,
    category: canonicalAttractionCategory(row),
    image_url: canonicalAttractionPhotos(row)[0] ?? null,
    rating: row.rating,
    review_count: row.review_count,
    price_from_usd: null,
    route_path: `/explore/places/${encodeURIComponent(row.slug ?? row.id)}`,
    source_table: 'places',
    score: 90,
    is_live_action: false,
  }
}

function isRawActivityResult(row: CatalogRpcRow): boolean {
  const value = `${row.result_type} ${row.category ?? ''} ${row.source_table}`.toLowerCase()
  return [
    'attraction',
    'self_tour',
    'bahamas_attractions',
    'cruise_itineraries',
    'activity',
    'beach',
    'tour',
    'excursion',
    'landmark',
    'museum',
    'park',
  ].some((token) => value.includes(token))
}
