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

  const staticPages: MetadataRoute.Sitemap = [
    { path: '', changeFrequency: 'weekly', priority: 1 },
    { path: '/stays', changeFrequency: 'daily', priority: 0.9 },
    { path: '/flights', changeFrequency: 'daily', priority: 0.9 },
    { path: '/explore', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/explore/places', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/destinations', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/guides', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/nassau-cruise-itineraries', changeFrequency: 'weekly', priority: 0.75 },
    { path: '/nassau-cruise-day-planner', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/build-my-cruise-day', changeFrequency: 'weekly', priority: 0.65 },
    { path: '/deals', changeFrequency: 'daily', priority: 0.75 },
    { path: '/restaurants', changeFrequency: 'weekly', priority: 0.65 },
    { path: '/concierge-trip-plan', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/partners', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/list-your-property', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/help', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.45 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.4 },
    { path: '/accessibility', changeFrequency: 'yearly', priority: 0.35 },
    { path: '/login', changeFrequency: 'monthly', priority: 0.5 },
  ].map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: page.priority,
  }))

  return [
    ...staticPages,
    ...islandPages,
    ...placePages,
    ...guidePages,
  ]
}
