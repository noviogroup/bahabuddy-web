import { NextRequest, NextResponse } from 'next/server'

import {
  cleanCatalogQuery,
  normalizeCatalogResult,
  parseCatalogFilter,
  parseCatalogIsland,
  type CatalogRpcRow,
} from '@/lib/catalog-search'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const query = cleanCatalogQuery(request.nextUrl.searchParams.get('q'))
  const filter = parseCatalogFilter(request.nextUrl.searchParams.get('filter'))
  const island = parseCatalogIsland(request.nextUrl.searchParams.get('island'))
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
    const { data, error } = await supabase.rpc('search_catalog', {
      p_query: query,
      p_filter: filter,
      p_island: island,
      p_limit: limit,
    })

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

    const results = ((data ?? []) as CatalogRpcRow[]).map(normalizeCatalogResult)
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
