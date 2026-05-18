/**
 * sitemap.ts — public site map for crawlers.
 *
 * Surfaces the marketing routes Google should index. Authenticated
 * dashboard routes are excluded via `robots.ts` and don't appear here.
 *
 * The island detail pages at `/explore/island/[id]` are pre-built via
 * `generateStaticParams` from `ISLAND_CONFIGS`, so we list them
 * statically here as well. Crawlers can find them either way, but
 * explicit listings get them indexed faster.
 *
 * Article slugs come from Sanity. When Sanity is unconfigured,
 * `fetchAllArticleSlugs` returns an empty array — sitemap stays valid.
 */

import { MetadataRoute } from 'next'
import { fetchAllArticleSlugs } from '@/lib/sanity/queries'
import { ISLAND_CONFIGS } from '@/lib/island-config'
import { createClient } from '@/lib/supabase/server'

async function fetchPlaceIds(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('bahamas_attractions')
      .select('id')
      .limit(500)
    return data?.map((d: { id: string }) => d.id) ?? []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bahabuddy.app'
  const now = new Date()

  const [articleSlugs, placeIds] = await Promise.all([
    fetchAllArticleSlugs(),
    fetchPlaceIds(),
  ])

  const guidePages: MetadataRoute.Sitemap = articleSlugs.map((slug) => ({
    url: `${baseUrl}/guides/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const islandPages: MetadataRoute.Sitemap = ISLAND_CONFIGS.map((island) => ({
    url: `${baseUrl}/explore/island/${island.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const placePages: MetadataRoute.Sitemap = placeIds.map((id) => ({
    url: `${baseUrl}/explore/places/${id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/destinations`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/explore/places`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    ...islandPages,
    ...placePages,
    {
      url: `${baseUrl}/guides`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...guidePages,
    {
      url: `${baseUrl}/deals`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
