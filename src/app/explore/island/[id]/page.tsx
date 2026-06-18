/**
 * /explore/island/[id] — the canonical island detail page.
 *
 * This is where DestinationCard in chat lands (per the chat-vs-detail
 * page split, decision §26). Marketing surface (outside the dashboard
 * route group, decision §2) so it can be crawled, indexed, and
 * shared without auth.
 *
 * URL slug system: mobile-canonical (`the-exumas`,
 * `nassau-paradise-island`, etc.) — matches `bahamas_attractions.island`
 * AND `ISLANDS[].slug` in `baha-images.ts`. One slug space, no
 * translation layer needed when chat-tools or mobile pass an island_id.
 *
 * Data sources, in priority order:
 *
 *   1. Sanity `destination` (matched on `islandId === slug`) — editorial
 *      overview (Portable Text), tagline, highlights, gallery,
 *      bestTimeToVisit, gettingThere, hero image.
 *
 *   2. Hardcoded `ISLAND_CONFIGS` (in `src/lib/island-config.ts`) —
 *      tagline, hero, vibe, bestTime, tripLength, description.
 *
 *   3. Supabase `bahamas_attractions` — categorized "Things to Do".
 *
 *   4. Supabase `bahamas_deals` — current limited-time offers.
 *
 * Static generation: `generateStaticParams` emits the 10 hardcoded
 * ISLAND_CONFIGS slugs at build time. Sanity-only slugs resolve
 * on-demand (Next.js `dynamicParams: true` is the default) and cache
 * for `revalidate` seconds.
 *
 * Revalidation: 300 seconds so newly-published Sanity content
 * surfaces quickly without a redeploy.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { createClient } from '@/lib/supabase/server'
import {
  ISLAND_CONFIGS,
  getIslandConfig,
  getIslandDbSlug,
} from '@/lib/island-config'
import { getIslandHero } from '@/lib/islands'
import { fetchDestinationByIsland } from '@/lib/sanity/queries'

import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import PortableTextBody from '@/components/PortableTextBody'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import TrackView from '@/components/TrackView'

export const revalidate = 300

// ─── Types ──────────────────────────────────────────────────────────────────

interface Attraction {
  id: string
  name: string
  category: string
  island: string | null
  description: string
  image_url: string | null
  tags: string[]
  rating: number | null
  review_count: number | null
  amenities: string[] | null
  short_description: string | null
  enriched_at: string | null
}

interface Deal {
  id: string
  title: string
  deal_type: string
  island: string | null
  resort_name: string | null
  description: string
  price_from_usd: number | null
  price_unit: string | null
  image_url: string | null
  highlights: string[]
  tags: string[]
  valid_through: string | null
}

// ─── Supabase fetchers ──────────────────────────────────────────────────────

async function getIslandAttractions(dbSlug: string): Promise<Attraction[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('bahamas_attractions')
      .select('id, name, category, island, description, image_url, tags, rating, review_count, amenities, short_description, enriched_at')
      .eq('island', dbSlug)
      .limit(24)
    return (data as Attraction[]) ?? []
  } catch {
    return []
  }
}

async function getIslandDeals(dbSlug: string): Promise<Deal[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('bahamas_deals')
      .select('id, title, deal_type, island, resort_name, description, price_from_usd, price_unit, image_url, highlights, tags, valid_through')
      .eq('island', dbSlug)
      .eq('is_active', true)
      .limit(6)
    return (data as Deal[]) ?? []
  } catch {
    return []
  }
}

function groupAttractionsByCategory(attractions: Attraction[]): Map<string, Attraction[]> {
  const groups = new Map<string, Attraction[]>()
  for (const a of attractions) {
    const cat = a.category || 'other'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(a)
  }
  return groups
}

function formatPrice(price: number | null, unit: string | null): string {
  if (!price) return 'Contact for price'
  const units: Record<string, string> = {
    per_night: '/night',
    per_person: '/person',
    per_day: '/day',
    per_charter: '/charter',
    total: ' total',
  }
  return `From $${price.toLocaleString()}${unit ? (units[unit] ?? '') : ''}`
}

// ─── Visual maps ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  attraction: 'bg-brand-500/80 text-white',
  beach: 'bg-gold-500/80 text-white',
  beach_bar: 'bg-amber-500/80 text-white',
  cultural: 'bg-purple-500/80 text-white',
  diving: 'bg-sky-600/80 text-white',
  event: 'bg-pink-500/80 text-white',
  fishing: 'bg-teal-600/80 text-white',
  food_culture: 'bg-rose-500/80 text-white',
  landmark: 'bg-stone-600/80 text-white',
  national_park: 'bg-emerald-600/80 text-white',
  natural_wonder: 'bg-emerald-500/80 text-white',
  snorkeling: 'bg-cyan-500/80 text-white',
  wildlife: 'bg-lime-600/80 text-white',
  other: 'bg-gray-600/80 text-white',
}

const CATEGORY_LABELS: Record<string, string> = {
  attraction: 'Attractions',
  beach: 'Beaches',
  beach_bar: 'Beach Bars',
  cultural: 'Culture',
  diving: 'Diving',
  event: 'Events',
  fishing: 'Fishing',
  food_culture: 'Food & Drink',
  landmark: 'Landmarks',
  national_park: 'National Parks',
  natural_wonder: 'Natural Wonders',
  snorkeling: 'Snorkeling',
  wildlife: 'Wildlife',
  other: 'More to See',
}

const DEAL_TYPE_BADGE: Record<string, string> = {
  accommodation: 'bg-brand-600/80 text-white',
  tour: 'bg-brand-600/80 text-white',
  package: 'bg-purple-600/80 text-white',
  activity: 'bg-gold-500/80 text-white',
}

// ─── Static params + metadata ───────────────────────────────────────────────

export async function generateStaticParams() {
  return ISLAND_CONFIGS.map(i => ({ id: i.slug }))
}

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const config = getIslandConfig(params.id)
  const [sanity, dbHero] = await Promise.all([
    fetchDestinationByIsland(params.id),
    config ? getIslandHero(config.slug) : Promise.resolve(undefined),
  ])

  if (!config && !sanity) return {}

  const name = sanity?.name ?? config?.name ?? params.id
  const tagline = sanity?.tagline ?? config?.tagline ?? ''
  // Sanity hero wins when published; otherwise the DB-sourced URL from
  // `islands.hero_image_url`. We no longer fall back to BahaImages here.
  const heroUrl = sanity?.imageUrl ?? dbHero

  return {
    title: `${name} — Bahamas Travel Guide | Baha Buddy`,
    description: `Plan the perfect trip to ${name}, Bahamas. ${tagline} Attractions, deals, and local tips.`,
    alternates: {
      canonical: `/explore/island/${params.id}`,
    },
    openGraph: {
      title: `${name} Travel Guide | Baha Buddy`,
      description: `Plan your ${name} trip — ${tagline}`,
      images: heroUrl ? [{ url: heroUrl }] : undefined,
    },
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function IslandDetailPage({ params }: PageProps) {
  const config = getIslandConfig(params.id)
  // Supabase query slug. Configs override when shared with a sibling
  // (e.g. paradise-island queries nassau-paradise-island). Sanity-only
  // islands without a config fall back to the URL id directly.
  const dbSlug = config ? getIslandDbSlug(config) : params.id

  // Sanity + Supabase fetches in parallel.
  const [sanity, attractions, deals, dbHero] = await Promise.all([
    fetchDestinationByIsland(params.id),
    getIslandAttractions(dbSlug),
    getIslandDeals(dbSlug),
    config ? getIslandHero(config.slug) : Promise.resolve(''),
  ])

  // Neither hardcoded nor Sanity knows this slug → 404
  if (!config && !sanity) notFound()

  // Derived display fields (Sanity wins where present, config fills gaps).
  // Hero priority: Sanity image > islands table (DB) > empty (gradient placeholder).
  const name = sanity?.name ?? config!.name
  const tagline = sanity?.tagline ?? config?.tagline ?? ''
  const heroUrl = sanity?.imageUrl ?? dbHero
  const bestTime = sanity?.bestTimeToVisit ?? config?.bestTime ?? 'Year-round'
  const vibe = config?.vibe ?? 'Island life'
  const tripLength = config?.tripLength ?? '3–5 days'
  const overviewPortable = sanity?.overview
  const overviewProse = config?.description ?? ''
  const highlights = sanity?.highlights ?? []
  const gallery = sanity?.gallery ?? []
  const gettingThere = sanity?.gettingThere ?? null

  const attractionsByCategory = groupAttractionsByCategory(attractions)

  const planPrompt = `Plan a trip to ${name} in the Bahamas`
  const addPrompt = `Add ${name} to my Bahamas trip plan`

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="island_viewed" props={{ island_id: params.id, island_name: name }} />
      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-700 to-brand-400" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 max-w-6xl mx-auto">
          <nav className="text-white/70 text-sm mb-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2" aria-hidden="true">›</span>
            <Link href="/explore/places" className="hover:text-white transition-colors">Places</Link>
            <span className="mx-2" aria-hidden="true">›</span>
            <span className="text-white">{name}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{name}</h1>
          {tagline && (
            <p className="text-white/90 text-lg max-w-2xl">{tagline}</p>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 bg-brand-50 rounded-2xl p-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Best Time</p>
            <p className="text-sm md:text-base font-semibold text-gray-900">{bestTime}</p>
          </div>
          <div className="text-center border-x border-brand-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Vibe</p>
            <p className="text-sm md:text-base font-semibold text-gray-900">{vibe}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Avg Trip</p>
            <p className="text-sm md:text-base font-semibold text-gray-900">{tripLength}</p>
          </div>
        </div>

        {/* Overview — Sanity Portable Text > prose description */}
        <section className="mb-12 max-w-3xl">
          {overviewPortable && overviewPortable.length > 0 ? (
            <PortableTextBody body={overviewPortable} />
          ) : (
            <p className="text-gray-600 text-lg leading-relaxed">{overviewProse}</p>
          )}
        </section>

        {/* Highlights — Sanity-only */}
        {highlights.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Don&apos;t miss</h2>
            <div className="flex flex-wrap gap-2">
              {highlights.map((h, idx) => (
                <span
                  key={`${h.label}-${idx}`}
                  className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium rounded-full px-4 py-2 border border-brand-100"
                >
                  {h.icon && <span aria-hidden="true">{h.icon}</span>}
                  {h.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Getting There — Sanity-only */}
        {gettingThere && (
          <section className="mb-12 bg-sand-50 rounded-2xl p-6 md:p-8 border border-sand-100">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span aria-hidden="true">✈️</span> Getting there
            </h2>
            <p className="text-gray-600 leading-relaxed">{gettingThere}</p>
          </section>
        )}

        {/* Gallery — Sanity-only */}
        {gallery.length > 0 && (
          <section className="mb-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.slice(0, 6).map((url, idx) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100"
                >
                  <Image
                    src={url}
                    alt={`${name} — gallery image ${idx + 1}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Things to Do — grouped attractions */}
        {attractionsByCategory.size > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Things to do</h2>
              <Link
                href={`/explore/places?island=${encodeURIComponent(name)}`}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Browse all →
              </Link>
            </div>

            <div className="space-y-10">
              {Array.from(attractionsByCategory.entries()).map(([category, items]) => {
                const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
                const categoryLabel = CATEGORY_LABELS[category] ?? category
                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <span className={`text-xs font-bold rounded-full px-3 py-1 ${categoryColor}`}>
                        {categoryLabel}
                      </span>
                      <span className="text-sm text-gray-400 font-normal">
                        {items.length} {items.length === 1 ? 'place' : 'places'}
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {items.map(a => (
                        <AttractionCard key={a.id} attraction={a} islandName={name} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Current Deals */}
        {deals.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Current deals</h2>
              <Link href="/deals" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                All deals →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map(d => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
          </section>
        )}

        {/* Plan with Buddy CTA */}
        <PlanWithBuddyCTA
          kind="experience"
          planPrompt={planPrompt}
          addPrompt={addPrompt}
        />

        {/* Other islands */}
        <div className="mt-14">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Explore other islands</h2>
          <div className="flex flex-wrap gap-3">
            {ISLAND_CONFIGS.filter(i => i.slug !== params.id).map(island => (
              <Link
                key={island.slug}
                href={`/explore/island/${island.slug}`}
                className="bg-gray-50 hover:bg-brand-50 text-gray-700 hover:text-brand-700 text-sm font-medium rounded-full px-4 py-2 transition-colors border border-gray-100 hover:border-brand-200"
              >
                {island.name}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AttractionCard({
  attraction,
}: {
  attraction: Attraction
  islandName: string
}) {
  const detailUrl = `/explore/places/${attraction.id}`
  const isEnriched = !!attraction.enriched_at

  return (
    <Link href={detailUrl} className="block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100 h-full">
        <div className="relative aspect-video overflow-hidden bg-stone-200">
          {attraction.image_url ? (
            <Image
              src={attraction.image_url}
              alt={attraction.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-200 to-brand-300 flex items-center justify-center">
            </div>
          )}
          {isEnriched && attraction.rating && (
            <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
              <span className="text-amber-400 text-xs">★</span>
              <span className="text-xs font-bold text-gray-800">{attraction.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h4 className="text-base font-bold text-gray-900 mb-1">{attraction.name}</h4>
          {isEnriched && attraction.review_count != null && attraction.review_count > 0 && (
            <p className="text-xs text-gray-400 mb-1">{attraction.review_count} reviews</p>
          )}
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
            {attraction.short_description || attraction.description}
          </p>
          <div className="flex items-center justify-between mt-auto">
            {attraction.tags && attraction.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {attraction.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="text-xs bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <span className="text-xs font-semibold text-brand-600 group-hover:text-brand-700 transition-colors whitespace-nowrap ml-2">
              View details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function DealCard({ deal }: { deal: Deal }) {
  const badge = DEAL_TYPE_BADGE[deal.deal_type] ?? 'bg-gray-600/80 text-white'
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100">
      <div className="relative aspect-video overflow-hidden bg-stone-200">
        {deal.image_url ? (
          <Image
            src={deal.image_url}
            alt={deal.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gold-200 to-gold-300 flex items-center justify-center">
            
          </div>
        )}
        <div
          className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm capitalize ${badge}`}
        >
          {deal.deal_type}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-bold text-gray-900 mb-1">{deal.title}</h3>
        {deal.resort_name && (
          <p className="text-xs text-gray-400 mb-1 font-medium">{deal.resort_name}</p>
        )}
        <p className="text-base font-bold text-brand-700 mb-1">
          {formatPrice(deal.price_from_usd, deal.price_unit)}
        </p>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
          {deal.description}
        </p>
        {deal.highlights && deal.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {deal.highlights.slice(0, 2).map(h => (
              <span
                key={h}
                className="text-xs bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 font-medium"
              >
                ✓ {h}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-auto">
          {deal.valid_through && (
            <span className="text-xs text-gray-400">
              Expires{' '}
              {new Date(deal.valid_through).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
          <Link
            href={`/dashboard/chat?q=${encodeURIComponent(`I'd like to book: ${deal.title}`)}`}
            className="ml-auto text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            Book now →
          </Link>
        </div>
      </div>
    </div>
  )
}
