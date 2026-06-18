import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import type { TripAdvisorLocation } from '@/lib/tripadvisor/types'
import { isIslandSlug, getIslandDisplayName, formatAddress, ISLAND_SLUG_MAP } from '@/lib/tripadvisor/types'
import DefaultHeaderHero from '@/components/DefaultHeaderHero'
import { resolveDefaultHeaderImage, resolveStaticDefaultHeaderImage } from '@/lib/default-headers'

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

async function IslandListingPage({ slug, islandName, restaurants }: { slug: string; islandName: string; restaurants: TripAdvisorLocation[] }) {
  const islandOptions = Object.entries(ISLAND_SLUG_MAP)
    .reduce<{ slug: string; name: string }[]>((acc, [s, n]) => {
      if (!acc.find((x) => x.name === n)) acc.push({ slug: s, name: n })
      return acc
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name))

  const heroHeader = await resolveDefaultHeaderImage({ island: islandName, businessType: 'Restaurant', preferredVariant: 'desktop' })

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

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="restaurants_island_viewed" props={{ island: islandName, restaurant_count: restaurants.length }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <DefaultHeaderHero
        eyebrow="Restaurants"
        title={`Best Restaurants in ${islandName}`}
        subtitle={`Top-rated dining in ${islandName}, Bahamas — with reviews and photos from TripAdvisor.`}
        header={heroHeader}
      />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href="/restaurants" className="text-sm rounded-full px-4 py-1.5 font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">All Islands</Link>
          {islandOptions.map((opt) => (
            <Link
              key={opt.slug}
              href={`/restaurants/${opt.slug}`}
              className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${opt.slug === slug ? 'bg-gold-400 text-night' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
              const cardHeader = resolveStaticDefaultHeaderImage({
                customImageUrl: rest.photos?.[0]?.url,
                island: rest.island_name,
                businessType: 'Restaurant',
                preferredVariant: 'card',
              })
              return (
                <Link key={rest.id} href={`/restaurants/${rest.location_id}`} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                  <div className="relative h-48 overflow-hidden bg-stone-200">
                    <Image src={cardHeader.url} alt={rest.photos?.[0]?.url ? rest.name : cardHeader.alt} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized />
                    {rest.rating && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                        <span className="text-amber-400 text-sm">★</span>
                        <span className="text-xs font-bold text-gray-700">{rest.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-1">{rest.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {rest.cuisine_types?.[0] && <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">{rest.cuisine_types[0]}</span>}
                      {rest.price_level && <span className="text-xs text-gray-400">{rest.price_level}</span>}
                    </div>
                    {rest.num_reviews != null && rest.num_reviews > 0 && <p className="text-xs text-gray-400 mt-1">{rest.num_reviews.toLocaleString()} reviews</p>}
                    <div className="mt-auto pt-4"><span className="text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">View details &rarr;</span></div>
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

async function RestaurantDetailPage({ restaurant, similar }: { restaurant: TripAdvisorLocation; similar: TripAdvisorLocation[] }) {
  const photos = restaurant.photos ?? []
  const heroHeader = await resolveDefaultHeaderImage({
    customImageUrl: photos[0]?.url,
    island: restaurant.island_name,
    businessType: 'Restaurant',
    preferredVariant: 'desktop',
  })
  const addr = formatAddress(restaurant.address)
  const reviews = restaurant.reviews ?? []
  const cuisines = restaurant.cuisine_types ?? []

  const planPrompt = `Tell me about ${restaurant.name}${restaurant.island_name ? ` in ${restaurant.island_name}` : ''}, Bahamas`
  const addPrompt = `Add ${restaurant.name} to my Bahamas dining plan`

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

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="restaurant_detail_viewed" props={{ location_id: restaurant.location_id, restaurant_name: restaurant.name, island: restaurant.island_name }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="relative h-72 md:h-[28rem] overflow-hidden">
        <Image src={heroHeader.url} alt={photos[0]?.url ? restaurant.name : heroHeader.alt} fill className="object-cover" priority sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-6xl mx-auto">
          <nav className="text-white/70 text-sm mb-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/restaurants" className="hover:text-white transition-colors">Restaurants</Link>
            {restaurant.island_name && <><span className="mx-2">›</span><span className="text-white/80">{restaurant.island_name}</span></>}
          </nav>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {cuisines.length > 0 && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-600/85 text-white backdrop-blur-sm">{cuisines[0]}</span>}
            {restaurant.price_level && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">{restaurant.price_level}</span>}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{restaurant.name}</h1>
          {restaurant.island_name && <p className="text-white/80 text-lg">{restaurant.island_name}, Bahamas</p>}
          {restaurant.rating && <div className="mt-3 flex items-center gap-2"><span className="text-amber-400 text-lg leading-none">★</span><span className="text-white font-bold text-lg">{restaurant.rating.toFixed(1)}</span>{restaurant.num_reviews != null && restaurant.num_reviews > 0 && <span className="text-white/60 text-sm">({restaurant.num_reviews.toLocaleString()} reviews)</span>}</div>}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {cuisines.length > 0 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Cuisine</h2><div className="flex flex-wrap gap-2">{cuisines.map((c) => <span key={c} className="text-sm bg-brand-50 text-brand-700 rounded-full px-4 py-1.5 font-medium border border-brand-100">{c}</span>)}</div></section>}

            {photos.length > 1 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{photos.slice(0, 9).map((photo, idx) => <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100"><Image src={photo.url} alt={photo.caption || `${restaurant.name} — photo ${idx + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 33vw" unoptimized /></div>)}</div></section>}

            {reviews.length > 0 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Guest Reviews</h2><div className="space-y-4">{reviews.slice(0, 5).map((review, idx) => <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100"><div className="flex items-center gap-2 mb-2">{review.rating && <span className="text-amber-400 text-sm leading-none">{'★'.repeat(Math.floor(review.rating))}<span className="text-gray-300">{'★'.repeat(5 - Math.floor(review.rating))}</span></span>}<span className="text-xs text-gray-400 font-medium">{review.author}</span></div><p className="text-sm text-gray-600 leading-relaxed">{review.text}</p></div>)}</div></section>}
          </div>

          <aside className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Details</h3>
              {restaurant.island_name && <div><p className="text-xs text-gray-400 font-medium">Location</p><p className="text-sm text-gray-700 font-medium">{restaurant.island_name}, Bahamas</p></div>}
              {addr && <div><p className="text-xs text-gray-400 font-medium">Address</p><p className="text-sm text-gray-700">{addr}</p></div>}
              {restaurant.price_level && <div><p className="text-xs text-gray-400 font-medium">Price level</p><PriceLevelDisplay level={restaurant.price_level} /></div>}
              {restaurant.website && <div><p className="text-xs text-gray-400 font-medium">Website</p><a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700 font-medium break-all">Visit website →</a></div>}
              {restaurant.tripadvisor_url && <div><p className="text-xs text-gray-400 font-medium">TripAdvisor</p><a href={restaurant.tripadvisor_url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 mt-1">View on TripAdvisor →</a></div>}
            </div>
          </aside>
        </div>

        <div className="mt-14"><PlanWithBuddyCTA kind="meal" planPrompt={planPrompt} addPrompt={addPrompt} /></div>

        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">More restaurants in {restaurant.island_name ?? 'the Bahamas'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((s) => {
                const cardHeader = resolveStaticDefaultHeaderImage({ customImageUrl: s.photos?.[0]?.url, island: s.island_name, businessType: 'Restaurant', preferredVariant: 'card' })
                return <Link key={s.id} href={`/restaurants/${s.location_id}`} className="group"><div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"><div className="relative aspect-video overflow-hidden bg-stone-100"><Image src={cardHeader.url} alt={s.photos?.[0]?.url ? s.name : cardHeader.alt} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" unoptimized /></div><div className="p-3"><h3 className="text-sm font-bold text-gray-900 line-clamp-1">{s.name}</h3><div className="flex items-center gap-2 mt-1">{s.cuisine_types?.[0] && <span className="text-[11px] text-brand-700 font-semibold">{s.cuisine_types[0]}</span>}{s.rating && <span className="text-xs text-amber-500 font-semibold">★ {s.rating.toFixed(1)}</span>}</div></div></div></Link>
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
