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
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { dealActionLinks } from '@/lib/deal-actions'
import { islandFoodLinks } from '@/lib/island-context-links'

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
  attraction: 'bg-white text-night ring-1 ring-gray-200',
  beach: 'bg-white text-night ring-1 ring-gray-200',
  beach_bar: 'bg-white text-night ring-1 ring-gray-200',
  cultural: 'bg-white text-night ring-1 ring-gray-200',
  diving: 'bg-white text-night ring-1 ring-gray-200',
  event: 'bg-white text-night ring-1 ring-gray-200',
  fishing: 'bg-white text-night ring-1 ring-gray-200',
  food_culture: 'bg-white text-night ring-1 ring-gray-200',
  landmark: 'bg-white text-night ring-1 ring-gray-200',
  national_park: 'bg-white text-night ring-1 ring-gray-200',
  natural_wonder: 'bg-white text-night ring-1 ring-gray-200',
  snorkeling: 'bg-white text-night ring-1 ring-gray-200',
  wildlife: 'bg-white text-night ring-1 ring-gray-200',
  other: 'bg-white text-night ring-1 ring-gray-200',
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
  accommodation: 'bg-white/95 text-night ring-1 ring-gray-200',
  tour: 'bg-white/95 text-night ring-1 ring-gray-200',
  package: 'bg-white/95 text-night ring-1 ring-gray-200',
  activity: 'bg-white/95 text-night ring-1 ring-gray-200',
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
  const primaryImageUrl = heroUrl || gallery[0] || null

  const attractionsByCategory = groupAttractionsByCategory(attractions)

  const planPrompt = `Plan a trip to ${name} in the Bahamas`
  const addPrompt = `Help me plan around ${name} and compare it with other Bahamas islands`
  const islandPath = `/explore/island/${params.id}`
  const foodLinks = islandFoodLinks({
    islandName: name,
    islandSlug: params.id,
    returnPath: islandPath,
  })
  const islandPlacesHref = `/explore/places?island=${encodeURIComponent(name)}`
  const islandStaysHref = `/stays?island=${encodeURIComponent(name)}`

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="island_viewed" props={{ island_id: params.id, island_name: name }} />

      <CompactPageHeader
        eyebrow="Island guide"
        title={name}
        subtitle={tagline || 'Plan where to stay, what to do, and how this island fits your Bahamas trip.'}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/explore', label: 'Explore' },
          { href: '/explore/places', label: 'Places' },
          { label: name },
        ]}
        actions={
          <>
            <Link href={foodLinks.startTripHref} className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700">
              Start island trip
            </Link>
            <Link href={islandStaysHref} className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-night transition hover:border-gray-300 hover:bg-gray-50">
              Browse stays
            </Link>
            <Link href={islandPlacesHref} className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-night transition hover:border-gray-300 hover:bg-gray-50">
              Things to do
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
            Best time: {bestTime}
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
            {vibe}
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
            {tripLength}
          </span>
        </div>
      </CompactPageHeader>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <ImageWithSourcePolicy
          src={primaryImageUrl}
          alt={name}
          title={name}
          eyebrow="Island guide"
          description="Island details are available. Provider or destination image is not available yet."
          pendingLabel="Photo pending"
          tone="island"
          className="mb-10 aspect-[16/7] min-h-[240px] rounded-baha-xl border border-gray-200 shadow-sm"
          imageClassName="object-cover"
          sizes="(max-width: 768px) 100vw, 1100px"
          priority
        />

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Best Time</p>
            <p className="text-sm md:text-base font-semibold text-gray-900">{bestTime}</p>
          </div>
          <div className="text-center border-x border-gray-200">
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
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal"
                >
                  {h.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Getting There — Sanity-only */}
        {gettingThere && (
          <section className="mb-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              Getting there
            </h2>
            <p className="text-gray-600 leading-relaxed">{gettingThere}</p>
          </section>
        )}

        <section className="mb-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4 md:px-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-charcoal">
              Food and culture
            </p>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  Eat your way through {name}
                </h2>
                <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-gray-500">
                  Restaurants stay contextual to island planning: browse dining, find food-culture stops, or start a trip from this island page.
                </p>
              </div>
              {foodLinks.restaurantIsland && (
                <span className="inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-charcoal ring-1 ring-gray-200">
                  Filtered for {foodLinks.restaurantIsland}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-3 md:p-6">
            <Link
              href={foodLinks.restaurantsHref}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-charcoal">Dining</p>
              <h3 className="mt-1 text-base font-extrabold text-gray-900">Browse restaurants</h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-gray-500">Open the restaurant feed already narrowed to this island.</p>
            </Link>
            <Link
              href={foodLinks.foodCultureHref}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-charcoal">Explore</p>
              <h3 className="mt-1 text-base font-extrabold text-gray-900">Food and culture stops</h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-gray-500">See cultural places and local food experiences near this island.</p>
            </Link>
            <Link
              href={foodLinks.startTripHref}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-charcoal">Trip action</p>
              <h3 className="mt-1 text-base font-extrabold text-gray-900">Start an island trip</h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-gray-500">Create a trip from this island context without adding it as a fake activity.</p>
            </Link>
          </div>

          <div className="border-t border-gray-200 bg-white px-5 py-4 md:px-6">
            <Link
              href={foodLinks.askBuddyHref}
              className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Ask Buddy for food picks
            </Link>
          </div>
        </section>

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
                <DealCard key={d.id} deal={d} returnPath={islandPath} />
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
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-night"
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
  islandName,
}: {
  attraction: Attraction
  islandName: string
}) {
  const detailUrl = `/explore/places/${attraction.id}`
  const isEnriched = !!attraction.enriched_at
  const categoryLabel = CATEGORY_LABELS[attraction.category] ?? attraction.category ?? 'Island stop'
  const previewReason = attractionPreviewReason(attraction, islandName, categoryLabel)

  return (
    <Link href={detailUrl} className="block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100 h-full">
        <ImageWithSourcePolicy
          src={attraction.image_url}
          alt={attraction.name}
          title={attraction.name}
          eyebrow={categoryLabel}
          description="Real island stop data is available. Photo is not available yet."
          className="aspect-video"
          tone="activity"
          unoptimized={false}
        >
          {isEnriched && attraction.rating && (
            <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
              <span className="text-xs font-bold text-gray-800">Rating {attraction.rating.toFixed(1)}</span>
            </div>
          )}
        </ImageWithSourcePolicy>
        <div className="p-4 flex flex-col flex-1">
          <h4 className="text-base font-bold text-gray-900 mb-1">{attraction.name}</h4>
          {isEnriched && attraction.review_count != null && attraction.review_count > 0 && (
            <p className="text-xs text-gray-400 mb-1">{attraction.review_count} reviews</p>
          )}
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
            {attraction.short_description || attraction.description}
          </p>
          <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-charcoal">
              Why Buddy picked this
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-charcoal">
              {previewReason}
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto">
            {attraction.tags && attraction.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {attraction.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-charcoal"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <span className="ml-2 whitespace-nowrap text-xs font-semibold text-night transition-colors group-hover:text-gray-700">
              View details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function attractionPreviewReason(attraction: Attraction, islandName: string, categoryLabel: string): string {
  if (attraction.rating && attraction.rating >= 4.5) {
    return `Strong traveler rating for ${categoryLabel.toLowerCase()} plans on ${islandName}.`
  }
  if (attraction.tags && attraction.tags.length > 0) {
    return `Good fit for ${attraction.tags.slice(0, 2).join(' and ').toLowerCase()} travelers on ${islandName}.`
  }
  if (attraction.short_description) return attraction.short_description
  return `Useful ${categoryLabel.toLowerCase()} stop to compare before adding it to an island day.`
}

function DealCard({ deal, returnPath }: { deal: Deal; returnPath: string }) {
  const badge = DEAL_TYPE_BADGE[deal.deal_type] ?? 'bg-gray-600/80 text-white'
  const action = dealActionLinks(deal, returnPath)
  const previewReason = dealPreviewReason(deal, action.contextLabel)
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100">
      <ImageWithSourcePolicy
        src={deal.image_url}
        alt={deal.title}
        title={deal.title}
        eyebrow={action.contextLabel}
        description="Deal details are available. Provider photo is not available yet."
        className="aspect-video"
        tone="deal"
        unoptimized={false}
      >
        <div
          className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm capitalize ${badge}`}
        >
          {deal.deal_type}
        </div>
      </ImageWithSourcePolicy>
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
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-charcoal"
              >
                {h}
              </span>
            ))}
          </div>
        )}
        <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-charcoal">
            Why Buddy picked this
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-charcoal">
            {previewReason}
          </p>
        </div>
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
            href={action.primaryHref}
            className="ml-auto whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-extrabold text-white transition-colors hover:bg-brand-700"
          >
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gold-400 align-middle" aria-hidden="true" />
            {action.primaryLabel}
          </Link>
          <Link
            href={action.secondaryHref}
            className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            Ask Buddy
          </Link>
        </div>
      </div>
    </div>
  )
}

function dealPreviewReason(deal: Deal, contextLabel: string): string {
  if (deal.price_from_usd) {
    return `${contextLabel} with visible starting price so travelers can compare before opening checkout paths.`
  }
  if (deal.highlights && deal.highlights.length > 0) {
    return `Good fit for ${deal.highlights.slice(0, 2).join(' and ').toLowerCase()} travelers.`
  }
  return `${contextLabel} with a direct marketplace action and Buddy as secondary planning support.`
}
