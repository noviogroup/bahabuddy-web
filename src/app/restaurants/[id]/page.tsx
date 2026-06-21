import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import DirectTripItemActions from '@/components/trip/DirectTripItemActions'
import type { TripAdvisorLocation } from '@/lib/tripadvisor/types'
import { isIslandSlug, getIslandDisplayName, formatAddress, ISLAND_SLUG_MAP } from '@/lib/tripadvisor/types'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'

export const revalidate = 86400

interface PageProps {
  params: { id: string }
}

async function getRestaurantByLocationId(locationId: string): Promise<TripAdvisorLocation | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('location_id', locationId)
      .eq('category', 'restaurants')
      .single()
    if (error || !data) return null
    return data as TripAdvisorLocation
  } catch {
    return null
  }
}

async function getRestaurantsByIsland(islandName: string): Promise<TripAdvisorLocation[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('category', 'restaurants')
      .ilike('island_name', islandName)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(50)
    if (error || !data) return []
    return data as TripAdvisorLocation[]
  } catch {
    return []
  }
}

async function getSimilarRestaurants(restaurant: TripAdvisorLocation): Promise<TripAdvisorLocation[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('category', 'restaurants')
      .ilike('island_name', restaurant.island_name ?? '')
      .neq('location_id', restaurant.location_id)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(4)
    return (data as TripAdvisorLocation[]) ?? []
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.id

  if (isIslandSlug(slug)) {
    const name = getIslandDisplayName(slug)
    return {
      title: `Best Restaurants in ${name} Bahamas | Baha Buddy`,
      description: `Top-rated restaurants in ${name}, Bahamas. Browse by cuisine, rating, and price level with TripAdvisor reviews.`,
      alternates: { canonical: `/restaurants/${slug}` },
      openGraph: {
        title: `Best Restaurants in ${name} Bahamas | Baha Buddy`,
        description: `Browse top restaurants in ${name} with ratings and TripAdvisor reviews.`,
      },
    }
  }

  const restaurant = await getRestaurantByLocationId(slug)
  if (!restaurant) return {}
  const cuisine = restaurant.cuisine_types?.[0]
  return {
    title: `${restaurant.name}${cuisine ? ` — ${cuisine}` : ''} in ${restaurant.island_name ?? 'Bahamas'} | Baha Buddy`,
    description: `${restaurant.name}${cuisine ? ` (${cuisine})` : ''} in ${restaurant.island_name ?? 'the Bahamas'}. ${restaurant.rating ? `Rated ${restaurant.rating}/5` : ''} ${restaurant.num_reviews ? `(${restaurant.num_reviews} reviews)` : ''}`.trim(),
    alternates: { canonical: `/restaurants/${slug}` },
    openGraph: {
      title: `${restaurant.name} | Baha Buddy`,
      description: `${restaurant.name} restaurant in ${restaurant.island_name ?? 'the Bahamas'}`,
      images: restaurant.photos?.[0]?.url ? [{ url: restaurant.photos[0].url }] : undefined,
    },
  }
}

function PriceLevelDisplay({ level }: { level: string }) {
  const count = level === '$' ? 1 : level === '$$' ? 2 : level === '$$$' ? 3 : level === '$$$$' ? 4 : level.length
  return (
    <span className="font-bold text-brand-600 text-lg" aria-label={`Price level ${level}`}>
      {'$'.repeat(Math.min(count, 4))}
      <span className="text-gray-300">{'$'.repeat(Math.max(0, 4 - count))}</span>
    </span>
  )
}

function paramsFrom(values: Record<string, string | undefined | null>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value?.trim()) params.set(key, value.trim())
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function IslandListingPage({ slug, islandName, restaurants }: { slug: string; islandName: string; restaurants: TripAdvisorLocation[] }) {
  const islandOptions = Object.entries(ISLAND_SLUG_MAP)
    .reduce<{ slug: string; name: string }[]>((acc, [s, n]) => {
      if (!acc.find((x) => x.name === n)) acc.push({ slug: s, name: n })
      return acc
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best Restaurants in ${islandName}, Bahamas`,
    numberOfItems: restaurants.length,
    itemListElement: restaurants.slice(0, 20).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Restaurant',
        name: r.name,
        ...(r.cuisine_types && { servesCuisine: r.cuisine_types.join(', ') }),
        ...(r.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: r.rating,
            reviewCount: r.num_reviews ?? 0,
          },
        }),
      },
    })),
  }

  const startFoodTripHref = `/dashboard/trips/new${paramsFrom({ returnTo: `/restaurants/${slug}`, source: 'restaurant' })}`
  const exploreFoodCultureHref = `/explore/places${paramsFrom({ island: islandName, category: 'Dining', search: 'Food' })}`

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="restaurants_island_viewed" props={{ island: islandName, restaurant_count: restaurants.length }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <CompactPageHeader
        eyebrow="Restaurants"
        title={`Best Restaurants in ${islandName}`}
        subtitle={`Top-rated dining in ${islandName}, Bahamas with reviews and photos from TripAdvisor.`}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/restaurants', label: 'Restaurants' },
          { label: islandName },
        ]}
        actions={
          <>
            <Link href={startFoodTripHref} className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700">
              Start food trip
            </Link>
            <Link href={exploreFoodCultureHref} className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-night transition hover:border-gray-300 hover:bg-gray-50">
              Explore food culture
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
            Island guide
          </span>
        </div>
      </CompactPageHeader>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href="/restaurants" className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-700">All Islands</Link>
          {islandOptions.map((opt) => (
            <Link
              key={opt.slug}
              href={`/restaurants/${opt.slug}`}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${opt.slug === slug ? 'border-brand-600 bg-white text-brand-700 ring-2 ring-brand-100' : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-700'}`}
            >
              {opt.name}
            </Link>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-6">{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} in {islandName}</p>

        {restaurants.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">No restaurants found in {islandName}</p>
            <p className="text-sm mt-2">Restaurant data is being loaded — check back soon.</p>
            <Link href="/restaurants" className="inline-block mt-4 text-brand-600 hover:text-brand-700 text-sm font-medium">Browse all restaurants</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((rest) => {
              return (
                <Link key={rest.id} href={`/restaurants/${rest.location_id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <ImageWithSourcePolicy
                    src={rest.photos?.[0]?.url ?? null}
                    alt={rest.name}
                    title={rest.name}
                    eyebrow={rest.cuisine_types?.[0] ?? 'Restaurant'}
                    description="Restaurant details are available. Provider photo is not available yet."
                    pendingLabel="Photo pending"
                    tone="restaurant"
                    className="h-48"
                  >
                    {rest.rating && (
                      <div className="absolute top-3 right-3 inline-flex items-center bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                        <span className="text-xs font-bold text-gray-700">Rating {rest.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </ImageWithSourcePolicy>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-1">{rest.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {rest.cuisine_types?.[0] && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-charcoal">{rest.cuisine_types[0]}</span>}
                      {rest.price_level && <span className="text-xs text-gray-400">{rest.price_level}</span>}
                    </div>
                    {rest.num_reviews != null && rest.num_reviews > 0 && <p className="text-xs text-gray-400 mt-1">{rest.num_reviews.toLocaleString()} reviews</p>}
                    <div className="mt-auto pt-4"><span className="text-sm font-semibold text-brand-600 transition-colors group-hover:text-brand-700">View details</span></div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}

function RestaurantDetailPage({ restaurant, similar }: { restaurant: TripAdvisorLocation; similar: TripAdvisorLocation[] }) {
  const photos = restaurant.photos ?? []
  const addr = formatAddress(restaurant.address)
  const reviews = restaurant.reviews ?? []
  const cuisines = restaurant.cuisine_types ?? []

  const planPrompt = `Tell me about ${restaurant.name}${restaurant.island_name ? ` in ${restaurant.island_name}` : ''}, Bahamas`
  const addPrompt = `Help me plan a Bahamas day around ${restaurant.name}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    ...(cuisines.length > 0 && { servesCuisine: cuisines.join(', ') }),
    ...(addr && { address: { '@type': 'PostalAddress', streetAddress: restaurant.address?.street1, addressLocality: restaurant.address?.city, addressRegion: restaurant.address?.state, addressCountry: restaurant.address?.country ?? 'BS' } }),
    ...(restaurant.rating && { aggregateRating: { '@type': 'AggregateRating', ratingValue: restaurant.rating, bestRating: 5, reviewCount: restaurant.num_reviews ?? 0 } }),
    ...(restaurant.website && { url: restaurant.website }),
    ...(photos.length > 0 && { image: photos.map((p) => p.url) }),
  }

  const restaurantHref = `/restaurants/${restaurant.location_id}`
  const islandSlug = restaurant.island_name
    ? Object.entries(ISLAND_SLUG_MAP).find(([, name]) => name === restaurant.island_name)?.[0]
    : null
  const startFoodTripHref = `/dashboard/trips/new${paramsFrom({ returnTo: restaurantHref, source: 'restaurant' })}`
  const moreFoodHref = `/explore/places${paramsFrom({ island: restaurant.island_name, category: 'Dining', search: cuisines[0] ?? restaurant.name })}`

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="restaurant_detail_viewed" props={{ location_id: restaurant.location_id, restaurant_name: restaurant.name, island: restaurant.island_name }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <CompactPageHeader
        eyebrow="Restaurant detail"
        title={restaurant.name}
        subtitle={restaurant.island_name ? `${restaurant.island_name}, Bahamas` : 'Bahamas dining guide'}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/restaurants', label: 'Restaurants' },
          ...(restaurant.island_name
            ? [{ href: islandSlug ? `/restaurants/${islandSlug}` : undefined, label: restaurant.island_name }]
            : []),
          { label: restaurant.name },
        ]}
        actions={
          <>
            <Link href={startFoodTripHref} className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700">
              Start food trip
            </Link>
            <Link href={moreFoodHref} className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-night transition hover:border-gray-300 hover:bg-gray-50">
              More food nearby
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {cuisines.length > 0 && <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">{cuisines[0]}</span>}
          {restaurant.price_level && <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">{restaurant.price_level}</span>}
          {restaurant.rating && <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">Rating {restaurant.rating.toFixed(1)}{restaurant.num_reviews != null && restaurant.num_reviews > 0 ? ` (${restaurant.num_reviews.toLocaleString()} reviews)` : ''}</span>}
        </div>
      </CompactPageHeader>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <ImageWithSourcePolicy
          src={photos[0]?.url ?? null}
          alt={restaurant.name}
          title={restaurant.name}
          eyebrow={cuisines[0] ?? 'Restaurant'}
          description="Restaurant details are available. Provider photo is not available yet."
          pendingLabel="Photo pending"
          tone="restaurant"
          className="mb-10 aspect-[16/7] min-h-[240px] rounded-baha-xl border border-gray-200 shadow-sm"
          imageClassName="object-cover"
          sizes="(max-width: 768px) 100vw, 1100px"
          priority
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {cuisines.length > 0 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Cuisine</h2><div className="flex flex-wrap gap-2">{cuisines.map((c) => <span key={c} className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-charcoal">{c}</span>)}</div></section>}

            {photos.length > 1 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{photos.slice(0, 9).map((photo, idx) => <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100"><Image src={photo.url} alt={photo.caption || `${restaurant.name} — photo ${idx + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 33vw" unoptimized /></div>)}</div></section>}

            {reviews.length > 0 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Guest Reviews</h2><div className="space-y-4">{reviews.slice(0, 5).map((review, idx) => <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-5"><div className="flex items-center gap-2 mb-2">{review.rating && <span className="text-sm font-semibold leading-none text-night">Rating {review.rating.toFixed(1)}</span>}<span className="text-xs text-gray-400 font-medium">{review.author}</span></div><p className="text-sm text-gray-600 leading-relaxed">{review.text}</p></div>)}</div></section>}
          </div>

          <aside className="space-y-6">
            <DirectTripItemActions
              itemType="restaurant"
              sourceId={restaurant.location_id}
              sourceType="web_restaurant_detail"
              name={restaurant.name}
              island={restaurant.island_name}
              imageUrl={photos[0]?.url ?? null}
              returnPath={`/restaurants/${restaurant.location_id}#trip-actions`}
              heading="Save this restaurant"
              description="Add this dining pick directly to a trip. Buddy stays available for planning context."
              primaryLabel="Add restaurant to trip"
              createTripLabel="Create trip for this restaurant"
              savedLabel="Saved restaurant to trip"
              timeSlot="evening"
              notes={cuisines.length > 0 ? cuisines.join(', ') : undefined}
              metadata={{
                cuisineTypes: cuisines,
                priceLevel: restaurant.price_level,
                rating: restaurant.rating,
                reviewCount: restaurant.num_reviews,
                tripadvisorUrl: restaurant.tripadvisor_url,
              }}
            />

            <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Details</h3>
              {restaurant.island_name && <div><p className="text-xs text-gray-400 font-medium">Location</p><p className="text-sm text-gray-700 font-medium">{restaurant.island_name}, Bahamas</p></div>}
              {addr && <div><p className="text-xs text-gray-400 font-medium">Address</p><p className="text-sm text-gray-700">{addr}</p></div>}
              {restaurant.price_level && <div><p className="text-xs text-gray-400 font-medium">Price level</p><PriceLevelDisplay level={restaurant.price_level} /></div>}
              {restaurant.website && <div><p className="text-xs text-gray-400 font-medium">Website</p><a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-brand-600 hover:text-brand-700">Visit website</a></div>}
              {restaurant.tripadvisor_url && <div><p className="text-xs text-gray-400 font-medium">TripAdvisor</p><a href={restaurant.tripadvisor_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800">View on TripAdvisor</a></div>}
            </div>
          </aside>
        </div>

        <div className="mt-14"><PlanWithBuddyCTA kind="meal" planPrompt={planPrompt} addPrompt={addPrompt} /></div>

        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">More restaurants in {restaurant.island_name ?? 'the Bahamas'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((s) => {
                return (
                  <Link key={s.id} href={`/restaurants/${s.location_id}`} className="group">
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                      <ImageWithSourcePolicy
                        src={s.photos?.[0]?.url ?? null}
                        alt={s.name}
                        title={s.name}
                        eyebrow={s.cuisine_types?.[0] ?? 'Restaurant'}
                        description="Provider photo is not available yet."
                        pendingLabel="Photo pending"
                        tone="restaurant"
                        className="aspect-video"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                      <div className="p-3"><h3 className="line-clamp-1 text-sm font-bold text-gray-900">{s.name}</h3><div className="mt-1 flex items-center gap-2">{s.cuisine_types?.[0] && <span className="text-[11px] font-semibold text-charcoal">{s.cuisine_types[0]}</span>}{s.rating && <span className="text-xs font-semibold text-night">Rating {s.rating.toFixed(1)}</span>}</div></div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}

export default async function RestaurantSlugPage({ params }: PageProps) {
  const slug = params.id

  if (isIslandSlug(slug)) {
    const islandName = getIslandDisplayName(slug)
    const restaurants = await getRestaurantsByIsland(islandName)
    return <IslandListingPage slug={slug} islandName={islandName} restaurants={restaurants} />
  }

  const restaurant = await getRestaurantByLocationId(slug)
  if (!restaurant) notFound()

  const similar = await getSimilarRestaurants(restaurant)
  return <RestaurantDetailPage restaurant={restaurant} similar={similar} />
}
