import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { FilterChip } from '@/components/marketplace/ResultFilterPanel'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
} from '@/components/marketplace/TravelSearchFields'
import StayCardImage from '@/components/stays/StayCardImage'
import { buddyChatHref } from '@/lib/buddy-chat'
import { FEATURED_STAY_ISLANDS, getAmenityOptions, getCityOptions, getFeaturedStayHotels, getHotels, getIslandOptions, getPropertyTypes, hotelHeroPhotoUrl } from '@/lib/hotels'
import { getStayDeals, type StayDeal } from '@/lib/deals'
import {
  readStaySearchParams,
  stayAmenitiesLabel,
  stayAmenityUrlValue,
  stayDateRangeLabel,
  stayDetailUrl,
  stayRoomsLabel,
  staySearchUrl,
  stayTravelerDetail,
  stayTravelerLabel,
} from '@/lib/stay-search-params'
import { getStayTypeFilterOptions } from '@/lib/stay-property-types'
import { STAY_TRAVELER_TYPE_OPTIONS, stayTravelerTypeLabel } from '@/lib/stay-traveler-types'

export const metadata: Metadata = {
  title: 'Book Bahamas Hotels & Stays | Baha Buddy',
  description:
    'Browse 700+ Bahamas hotels, villas, and apartments. Check live availability, compare rates, and book your perfect stay.',
  openGraph: {
    title: 'Book Bahamas Hotels & Stays | Baha Buddy',
    description:
      'Find and book the perfect Bahamas stay with hotels, villas, and apartments with live rates.',
  },
}

export const revalidate = 3600

const DEFAULT_STAY_LIMIT = 6
const DEFAULT_STAY_ISLAND_LABEL = 'Nassau, Exuma, Harbour Island, Abaco, and Bimini'

function StarBadge({ stars }: { stars: number }) {
  return (
    <span className="text-charcoal text-xs font-semibold leading-none">
      {Math.floor(stars)}-star
    </span>
  )
}

function StaySidebarSection({
  label,
  description,
  count,
  children,
}: {
  label: string
  description?: string
  count?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-night">
          {label}
        </p>
        {count && (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-500 ring-1 ring-gray-200">
            {count}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
          {description}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {children}
      </div>
    </section>
  )
}

function stayPreviewReason(hotel: {
  property_type_name: string | null
  island: string | null
  star_rating: number | null
  review_score: number | null
  amenities: string[]
}): string {
  if (hotel.star_rating && hotel.star_rating >= 4) {
    return `${Math.floor(hotel.star_rating)}-star ${hotel.property_type_name ?? 'stay'}${hotel.island ? ` in ${hotel.island}` : ''} with stronger resort-class signals.`
  }
  if (hotel.review_score && hotel.review_score >= 8) {
    return `High guest score${hotel.island ? ` for ${hotel.island}` : ''}, useful for shortlisting before checking rates.`
  }
  if (hotel.amenities.length > 0) {
    return `Matches key stay needs: ${hotel.amenities.slice(0, 2).join(' and ')}.`
  }
  return `Real ${hotel.property_type_name ?? 'stay'} listing to compare before checking availability.`
}

function formatDealPrice(price: number | null, unit: string | null): string {
  if (!price) return 'Check offer'
  const units: Record<string, string> = {
    per_night: '/night',
    per_person: '/person',
    per_day: '/day',
    per_charter: '/charter',
    total: ' total',
  }
  return `From $${price.toLocaleString()}${unit ? (units[unit] ?? '') : ''}`
}

function StayDealsSection({ deals }: { deals: StayDeal[] }) {
  return (
    <section aria-labelledby="stay-deals-title" className="mt-10 rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
            Stay deals
          </p>
          <h2 id="stay-deals-title" className="mt-1 text-2xl font-extrabold text-night">
            Bahamas stay offers worth checking
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-charcoal">
            Live accommodation deals appear here when partner offers are active. Booking still happens through the stay detail and checkout flow.
          </p>
        </div>
        <Link
          href="/deals?type=accommodation"
          className="inline-flex w-fit items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors hover:bg-gray-50"
        >
          View all stay deals
        </Link>
      </div>

      {deals.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {deals.map((deal) => (
            <article key={deal.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <ImageWithSourcePolicy
                src={deal.image_url}
                alt={deal.title}
                title={deal.title}
                eyebrow="Stay deal"
                description="Deal details are available. Provider image is not available yet."
                pendingLabel="Image pending"
                className="h-40"
                imageClassName="object-cover transition-transform duration-500 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
                tone="deal"
              >
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-night shadow-sm">
                  Stay deal
                </div>
              </ImageWithSourcePolicy>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-extrabold leading-snug text-night">
                    {deal.title}
                  </h3>
                  <p className="shrink-0 text-right text-sm font-extrabold text-night">
                    {formatDealPrice(deal.price_from_usd, deal.price_unit)}
                  </p>
                </div>
                {deal.resort_name && (
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {deal.resort_name}
                  </p>
                )}
                <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-charcoal">
                  {deal.description}
                </p>
                {deal.highlights.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {deal.highlights.slice(0, 3).map((highlight) => (
                      <span key={highlight} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-charcoal">
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  {deal.island && (
                    <span className="text-xs font-bold text-gray-500">
                      {deal.island.replace(/-/g, ' ')}
                    </span>
                  )}
                  <Link
                    href={`/deals?type=${encodeURIComponent(deal.deal_type)}`}
                    className="ml-auto text-xs font-extrabold text-night underline underline-offset-4"
                  >
                    Review deal
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
          <p className="text-sm font-extrabold text-night">No active stay deals are loaded right now.</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-charcoal">
            You can still compare the best starred stays above, or open the deals page to check package and activity offers.
          </p>
        </div>
      )}
    </section>
  )
}

function StayFaqSection() {
  const faqs = [
    {
      question: 'Why does the default stay page start with these islands?',
      answer: 'They cover the highest-intent Bahamas stay searches: Nassau, Exuma, Harbour Island, Abaco, and Bimini. The default feed gives a strong starting point before a traveler narrows the search.',
    },
    {
      question: 'How are the default stays selected?',
      answer: 'Baha Buddy prioritizes active hotel records on those islands by star rating first, then guest score, review count, and available provider imagery.',
    },
    {
      question: 'Can travelers filter by homes, villas, apartments, or hotels?',
      answer: 'Yes. Use the stay type filter to narrow the feed by hotels, resorts, villas, homes, apartments, condos, and related property types when the provider data supports it.',
    },
    {
      question: 'When does booking require an account?',
      answer: 'Browsing is public. Saving to a trip, checking out, and creating a provider booking require a signed-in traveler account.',
    },
  ]

  return (
    <section aria-labelledby="stay-faq-title" className="mt-6 rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
        FAQ
      </p>
      <h2 id="stay-faq-title" className="mt-1 text-2xl font-extrabold text-night">
        Stays FAQ
      </h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {faqs.map((faq) => (
          <div key={faq.question} className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-extrabold text-night">
              {faq.question}
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-charcoal">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: {
    island?: string
    city?: string
    type?: string
    traveler_type?: string
    stars?: string
    guest_rating?: string
    amenities?: string
    sort?: string
    checkin?: string
    checkout?: string
    adults?: string
    children?: string
    rooms?: string
  }
}) {
  const staySearch = readStaySearchParams(searchParams)
  const activeIsland = staySearch.island
  const activeCity = staySearch.city
  const activeType = staySearch.type
  const activeTravelerType = staySearch.travelerType
  const activeTravelerTypeLabel = stayTravelerTypeLabel(activeTravelerType)
  const minStars = staySearch.minStars
  const minGuestRating = staySearch.minGuestRating
  const activeAmenities = staySearch.amenities
  const sortBy = staySearch.sort
  const dateRangeLabel = stayDateRangeLabel(staySearch)
  const amenitiesLabel = stayAmenitiesLabel(staySearch)
  const travelerLabel = stayTravelerLabel(staySearch)
  const travelerDetail = stayTravelerDetail(staySearch)
  const roomsLabel = stayRoomsLabel(staySearch)
  const hasActiveStaySearch = Boolean(
    activeIsland
    || activeCity
    || activeType
    || activeTravelerType
    || minStars
    || minGuestRating
    || activeAmenities.length > 0
    || staySearch.checkin
    || staySearch.checkout
    || staySearch.adults
    || staySearch.children != null
    || staySearch.rooms
    || sortBy === 'rating'
  )
  const isDefaultStayFeed = !hasActiveStaySearch

  const [initialHotels, islands, cities, propertyTypes, amenityOptions, stayDeals] = await Promise.all([
    isDefaultStayFeed
      ? getFeaturedStayHotels(DEFAULT_STAY_LIMIT)
      : getHotels({
          island: activeIsland || undefined,
          city: activeCity || undefined,
          propertyType: activeType || undefined,
          travelerType: activeTravelerType || undefined,
          minStars: minStars && minStars >= 1 && minStars <= 5 ? minStars : undefined,
          minGuestRating,
          amenities: activeAmenities,
          sort: sortBy as 'rating' | 'stars',
        }),
    getIslandOptions(),
    getCityOptions(activeIsland || undefined),
    getPropertyTypes(),
    getAmenityOptions(),
    getStayDeals(3),
  ])
  const hotels = isDefaultStayFeed && initialHotels.length === 0
    ? await getHotels({ sort: 'stars' })
    : initialHotels

  function buildFilterUrl(overrides: Record<string, string | undefined>) {
    return staySearchUrl(staySearch, overrides)
  }

  function toggleAmenityUrl(amenity: string) {
    const next = activeAmenities.includes(amenity)
      ? activeAmenities.filter((value) => value !== amenity)
      : [...activeAmenities, amenity]
    return buildFilterUrl({ amenities: stayAmenityUrlValue(next) })
  }

  const visibleAmenityOptions = Array.from(new Set([...activeAmenities, ...amenityOptions])).slice(0, 14)
  const selectableIslands = activeIsland && !islands.includes(activeIsland)
    ? [activeIsland, ...islands]
    : islands
  const selectableCities = activeCity && !cities.includes(activeCity)
    ? [activeCity, ...cities]
    : cities
  const providerPropertyTypes = activeType && !propertyTypes.includes(activeType)
    ? [activeType, ...propertyTypes]
    : propertyTypes
  const selectablePropertyTypes = getStayTypeFilterOptions(providerPropertyTypes)
  const popularStayTypes = getStayTypeFilterOptions(selectablePropertyTypes)
    .filter((type) => ['Hotel', 'Resort', 'Villa', 'Home', 'House', 'Apartment', 'Condo'].includes(type))
    .slice(0, 7)

  const activeFilters = [
    activeIsland ? { label: 'Island', value: activeIsland, href: buildFilterUrl({ island: undefined }) } : null,
    activeCity ? { label: 'Area', value: activeCity, href: buildFilterUrl({ city: undefined }) } : null,
    activeType ? { label: 'Stay type', value: activeType, href: buildFilterUrl({ type: undefined }) } : null,
    activeTravelerTypeLabel ? { label: 'Best for', value: activeTravelerTypeLabel, href: buildFilterUrl({ traveler_type: undefined }) } : null,
    minStars ? { label: 'Star class', value: `${minStars}+ star`, href: buildFilterUrl({ stars: undefined }) } : null,
    minGuestRating ? { label: 'Guest score', value: `${minGuestRating}+`, href: buildFilterUrl({ guest_rating: undefined }) } : null,
    ...activeAmenities.map((amenity) => ({
      label: 'Amenity',
      value: amenity,
      href: buildFilterUrl({
        amenities: stayAmenityUrlValue(activeAmenities.filter((value) => value !== amenity)),
      }),
    })),
    sortBy === 'rating' ? { label: 'Sort', value: 'Top rated', href: buildFilterUrl({ sort: undefined }) } : null,
    dateRangeLabel ? { label: 'Dates', value: dateRangeLabel, href: buildFilterUrl({ checkin: undefined, checkout: undefined }) } : null,
    travelerLabel ? { label: 'Travelers', value: travelerLabel, href: buildFilterUrl({ adults: undefined, children: undefined }) } : null,
    roomsLabel ? { label: 'Rooms', value: roomsLabel, href: buildFilterUrl({ rooms: undefined }) } : null,
  ].filter((item): item is { label: string; value: string; href: string } => Boolean(item))

  const summaryItems = [
    {
      label: 'Destination',
      value: activeIsland || (isDefaultStayFeed ? 'Starter islands' : 'All Bahamas'),
      detail: activeCity || activeType || (isDefaultStayFeed ? DEFAULT_STAY_ISLAND_LABEL : 'All stay types'),
    },
    {
      label: 'Dates',
      value: dateRangeLabel || 'Add dates',
      detail: dateRangeLabel ? 'Preserved while filtering' : 'Check rates on the stay detail page',
    },
    {
      label: 'Travelers',
      value: travelerLabel || 'Add travelers',
      detail: travelerDetail || 'Set guests before booking',
    },
    {
      label: 'Rooms',
      value: roomsLabel || 'Any room count',
      detail: minStars ? `${minStars}+ star filter` : 'Compare options first',
    },
    {
      label: 'Fit',
      value: activeTravelerTypeLabel || amenitiesLabel || (minGuestRating ? `${minGuestRating}+ guest score` : 'Any amenities'),
      detail: activeTravelerTypeLabel
        ? 'Matched from property and amenity signals'
        : activeAmenities.length > 0
        ? `${activeAmenities.length} amenity ${activeAmenities.length === 1 ? 'match' : 'matches'}`
        : 'Use score and amenity filters',
    },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: activeIsland
      ? `Hotels in ${activeIsland}, Bahamas`
      : isDefaultStayFeed
        ? `Best starred stays in ${DEFAULT_STAY_ISLAND_LABEL}`
        : 'Hotels & Stays in the Bahamas',
    numberOfItems: hotels.length,
    itemListElement: hotels.slice(0, 20).map((h, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LodgingBusiness',
        name: h.name,
        ...(h.star_rating != null && h.star_rating > 0 && { starRating: { '@type': 'Rating', ratingValue: h.star_rating } }),
        ...(h.review_score != null && h.review_score > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: h.review_score,
            reviewCount: h.review_count ?? 0,
          },
        }),
      },
    })),
  }

  const renderFilterControls = () => (
    <>
      {selectableIslands.length > 0 && (
        <StaySidebarSection label="Island" description="Choose where you want to stay." count={`${selectableIslands.length} islands`}>
          <FilterChip href={buildFilterUrl({ island: undefined })} active={!activeIsland}>
            All islands
          </FilterChip>
          {selectableIslands.map((name) => (
            <FilterChip
              key={name}
              href={buildFilterUrl({ island: name, city: undefined })}
              active={activeIsland === name}
            >
              {name}
            </FilterChip>
          ))}
        </StaySidebarSection>
      )}

      {selectableCities.length > 0 && (
        <StaySidebarSection
          label="Area"
          description={activeIsland ? `Refine within ${activeIsland}.` : 'Use city or neighborhood-style provider areas.'}
          count={`${selectableCities.length} areas`}
        >
          <FilterChip href={buildFilterUrl({ city: undefined })} active={!activeCity}>
            All areas
          </FilterChip>
          {selectableCities.map((city) => (
            <FilterChip
              key={city}
              href={buildFilterUrl({ city })}
              active={activeCity === city}
              tone="neutral"
            >
              {city}
            </FilterChip>
          ))}
        </StaySidebarSection>
      )}

      {selectablePropertyTypes.length > 0 && (
        <StaySidebarSection
          label="Stay type"
          description="Hotels, resorts, villas, homes, houses, apartments, and condos."
          count={`${selectablePropertyTypes.length} types`}
        >
          <FilterChip href={buildFilterUrl({ type: undefined })} active={!activeType}>
            All types
          </FilterChip>
          {selectablePropertyTypes.map((type) => (
            <FilterChip
              key={type}
              href={buildFilterUrl({ type })}
              active={activeType === type}
            >
              {type}
            </FilterChip>
          ))}
        </StaySidebarSection>
      )}

      <StaySidebarSection label="Best for" description="Match existing stay signals to a traveler style." count={`${STAY_TRAVELER_TYPE_OPTIONS.length} styles`}>
        <FilterChip href={buildFilterUrl({ traveler_type: undefined })} active={!activeTravelerType}>
          Any traveler
        </FilterChip>
        {STAY_TRAVELER_TYPE_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            href={buildFilterUrl({ traveler_type: option.value })}
            active={activeTravelerType === option.value}
            tone="neutral"
          >
            {option.label}
          </FilterChip>
        ))}
      </StaySidebarSection>

      <StaySidebarSection label="Rating" description="Show higher-tier stays first." count="Star class">
        <FilterChip href={buildFilterUrl({ stars: undefined })} active={!minStars}>
          Any rating
        </FilterChip>
        {[3, 4, 5].map((stars) => (
          <FilterChip
            key={stars}
            href={buildFilterUrl({ stars: minStars === stars ? undefined : String(stars) })}
            active={minStars === stars}
          >
            {stars}+ star
          </FilterChip>
        ))}
      </StaySidebarSection>

      <StaySidebarSection label="Guest score" description="Use traveler review thresholds." count="Reviews">
        <FilterChip href={buildFilterUrl({ guest_rating: undefined })} active={!minGuestRating} tone="neutral">
          Any score
        </FilterChip>
        {[7, 8, 9].map((score) => (
          <FilterChip
            key={score}
            href={buildFilterUrl({ guest_rating: minGuestRating === score ? undefined : String(score) })}
            active={minGuestRating === score}
            tone="neutral"
          >
            {score}+ score
          </FilterChip>
        ))}
      </StaySidebarSection>

      {visibleAmenityOptions.length > 0 && (
        <StaySidebarSection label="Amenities" description="Match the stay features that matter." count={`${visibleAmenityOptions.length} amenities`}>
          <FilterChip href={buildFilterUrl({ amenities: undefined })} active={activeAmenities.length === 0}>
            Any amenities
          </FilterChip>
          {visibleAmenityOptions.map((amenity) => (
            <FilterChip
              key={amenity}
              href={toggleAmenityUrl(amenity)}
              active={activeAmenities.includes(amenity)}
            >
              {amenity}
            </FilterChip>
          ))}
        </StaySidebarSection>
      )}

      <StaySidebarSection label="Sort" description="Control the result order." count={sortBy === 'stars' ? 'Default' : 'Custom'}>
        <FilterChip href={buildFilterUrl({ sort: undefined })} active={sortBy === 'stars'}>
          Star rating
        </FilterChip>
        <FilterChip href={buildFilterUrl({ sort: 'rating' })} active={sortBy === 'rating'}>
          Top rated
        </FilterChip>
      </StaySidebarSection>
    </>
  )

  return (
    <div className="min-h-screen bg-white">
      <TrackView
        event="stays_directory_viewed"
        props={{
          island_filter: activeIsland || 'all',
          area_filter: activeCity || 'all',
          type_filter: activeType || 'all',
          traveler_type_filter: activeTravelerType || 'all',
          stars_filter: minStars ?? 'any',
          guest_rating_filter: minGuestRating ?? 'any',
          amenities_filter: activeAmenities,
          sort: sortBy,
          hotel_count: hotels.length,
          feed_mode: isDefaultStayFeed ? 'featured_starter_islands' : 'filtered_search',
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <CompactPageHeader
        eyebrow="Book your stay"
        title={activeIsland ? `Stays in ${activeIsland}` : isDefaultStayFeed ? 'Best Bahamas stays to start with' : 'Find your perfect Bahamas stay'}
        subtitle={isDefaultStayFeed
          ? `Start with 5-6 strong, star-led stay picks across ${DEFAULT_STAY_ISLAND_LABEL}. Refine by island, area, stay type, traveler fit, dates, amenities, or guest score when you are ready.`
          : 'Browse hotels, resorts, villas, homes, apartments, and condos across The Bahamas with area and traveler-fit filters where provider data supports the match.'}
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Stays' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <form
          action="/stays"
          method="get"
          aria-label="Search stays"
          className="mb-5 rounded-baha-lg border border-gray-200 bg-white p-3 shadow-sm md:p-4"
        >
          {minStars ? <input type="hidden" name="stars" value={String(minStars)} /> : null}
          {activeTravelerType ? <input type="hidden" name="traveler_type" value={activeTravelerType} /> : null}
          {minGuestRating ? <input type="hidden" name="guest_rating" value={String(minGuestRating)} /> : null}
          {activeAmenities.length > 0 ? <input type="hidden" name="amenities" value={activeAmenities.join(',')} /> : null}
          {sortBy === 'rating' ? <input type="hidden" name="sort" value="rating" /> : null}
          {staySearch.children ? <input type="hidden" name="children" value={String(staySearch.children)} /> : null}

          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
                Inline stay search
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-night">
                Refine Bahamas stays
              </h2>
            </div>
            <p className="max-w-md text-xs font-semibold leading-5 text-gray-500 md:text-right">
              Browse is public. Saving, checkout, and booking require a traveler account.
            </p>
          </div>

          <div
            data-testid="stay-primary-search-row"
            className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto]"
          >
            <TravelSearchField label="Destination" hint="Island" htmlFor="stay-island">
              <TravelSearchSelect
                id="stay-island"
                name="island"
                defaultValue={activeIsland}
              >
                <option value="">All Bahamas</option>
                {selectableIslands.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </TravelSearchSelect>
            </TravelSearchField>

            <TravelSearchField label="Area" hint={activeIsland || 'City'} htmlFor="stay-city">
              <TravelSearchSelect
                id="stay-city"
                name="city"
                defaultValue={activeCity}
              >
                <option value="">All areas</option>
                {selectableCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </TravelSearchSelect>
            </TravelSearchField>

            <TravelSearchField label="Stay type" hint="Hotels, villas, homes" htmlFor="stay-type">
              <TravelSearchSelect
                id="stay-type"
                name="type"
                defaultValue={activeType}
              >
                <option value="">All types</option>
                {selectablePropertyTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </TravelSearchSelect>
            </TravelSearchField>

            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 lg:min-w-36"
              >
                Search
              </button>
            </div>
          </div>

          <div
            data-testid="stay-detail-search-row"
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]"
          >
            <TravelSearchField label="Check-in" htmlFor="stay-checkin">
              <TravelSearchInput
                id="stay-checkin"
                type="date"
                name="checkin"
                defaultValue={staySearch.checkin}
              />
            </TravelSearchField>

            <TravelSearchField label="Check-out" htmlFor="stay-checkout">
              <TravelSearchInput
                id="stay-checkout"
                type="date"
                name="checkout"
                defaultValue={staySearch.checkout}
              />
            </TravelSearchField>

            <TravelSearchField label="Travelers" hint={travelerDetail || 'Adults'} htmlFor="stay-adults">
              <TravelSearchSelect
                id="stay-adults"
                name="adults"
                defaultValue={staySearch.adults ? String(staySearch.adults) : ''}
              >
                <option value="">Travelers</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                  <option key={count} value={count}>{count} {count === 1 ? 'adult' : 'adults'}</option>
                ))}
              </TravelSearchSelect>
            </TravelSearchField>

            <TravelSearchField label="Rooms" hint="Optional" htmlFor="stay-rooms">
              <TravelSearchSelect
                id="stay-rooms"
                name="rooms"
                defaultValue={staySearch.rooms ? String(staySearch.rooms) : ''}
              >
                <option value="">Rooms</option>
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>{count} {count === 1 ? 'room' : 'rooms'}</option>
                ))}
              </TravelSearchSelect>
            </TravelSearchField>
          </div>
        </form>

        {popularStayTypes.length > 0 && (
          <nav
            aria-label="Popular stay type shortcuts"
            className="mb-5 rounded-baha-lg border border-gray-200 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
                  Popular stay types
                </p>
                <p className="mt-1 text-sm font-semibold text-charcoal">
                  Jump straight to hotels, resorts, villas, homes, houses, apartments, or condos.
                </p>
              </div>
              <Link
                href={buildFilterUrl({ type: undefined })}
                className="inline-flex w-fit items-center justify-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-extrabold text-night transition-colors hover:bg-gray-50"
              >
                All types
              </Link>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {popularStayTypes.map((type) => (
                <FilterChip
                  key={type}
                  href={buildFilterUrl({ type })}
                  active={activeType === type}
                  tone="neutral"
                >
                  {type}
                </FilterChip>
              ))}
            </div>
          </nav>
        )}

        <div className="grid gap-5 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:items-start">
          <aside
            aria-label="Stay filters"
            className="rounded-baha-lg border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24"
          >
            <div className="border-b border-gray-100 bg-white px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
                Filter stays
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-night">
                {isDefaultStayFeed ? `${hotels.length} starter pick${hotels.length !== 1 ? 's' : ''}` : `${hotels.length} stay${hotels.length !== 1 ? 's' : ''} found`}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
                {isDefaultStayFeed
                  ? 'Default picks focus on Nassau, Exuma, Harbour Island, Abaco, and Bimini.'
                  : 'Narrow by island, area, stay type, traveler fit, star class, score, amenities, and sort.'}
              </p>
            </div>

            <div className="grid gap-2 border-b border-gray-100 p-4">
              {summaryItems.map((item) => (
                <div key={item.label} className="rounded-baha-md border border-gray-200 bg-white px-3 py-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-400">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-sm font-extrabold text-night">
                    {item.value}
                  </p>
                  {item.detail && (
                    <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">
                      {item.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-5 p-4">
              {activeFilters.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-night">
                      Active filters
                    </p>
                    <Link href="/stays" className="text-xs font-extrabold text-night hover:text-gray-700">
                      Clear all
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                      <Link
                        key={`${filter.label}-${filter.value}`}
                        href={filter.href}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-charcoal ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-night"
                      >
                        <span className="text-gray-400">{filter.label}:</span>
                        <span>{filter.value}</span>
                        <span className="text-gray-500" aria-hidden="true">Remove</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="inline-flex w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-500 ring-1 ring-gray-200">
                  {isDefaultStayFeed ? 'Showing starter picks' : 'Showing all stays'}
                </span>
              )}

              {renderFilterControls()}
            </div>
          </aside>

          <section aria-label="Stay results" className="min-w-0">
            {isDefaultStayFeed && (
              <div className="mb-5 rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
                  Default stay feed
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-night">
                  Best starred stays across the islands travelers ask for most
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
                  This starter set favors 4- and 5-star active provider records with real imagery where available, then balances the list across {DEFAULT_STAY_ISLAND_LABEL}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FEATURED_STAY_ISLANDS.map((island) => (
                    <Link
                      key={island.label}
                      href={buildFilterUrl({ island: island.label })}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-night transition-colors hover:bg-gray-50"
                    >
                      {island.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
                  {isDefaultStayFeed ? 'Starter picks' : 'Results'}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {hotels.length} stay{hotels.length !== 1 ? 's' : ''}
                  {activeIsland ? ` in ${activeIsland}` : ''}
                  {activeCity ? ` | ${activeCity}` : ''}
                  {activeType ? ` | ${activeType}` : ''}
                  {activeTravelerTypeLabel ? ` | ${activeTravelerTypeLabel}` : ''}
                  {minStars ? ` | ${minStars}+ star` : ''}
                  {minGuestRating ? ` | ${minGuestRating}+ guest score` : ''}
                  {activeAmenities.length > 0 ? ` | ${activeAmenities.length} amenity ${activeAmenities.length === 1 ? 'match' : 'matches'}` : ''}
                </p>
              </div>
              <p className="text-xs font-semibold text-gray-400">
                {isDefaultStayFeed ? `Focused on ${DEFAULT_STAY_ISLAND_LABEL}` : `Sorted by ${sortBy === 'stars' ? 'star rating' : 'top rated'}`}
              </p>
            </div>

            {hotels.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg font-medium text-gray-600">No stays found</p>
                <p className="text-sm mt-2">
                  Try a different island, area, stay type, traveler fit, star class, guest score, amenity, or date range.
                </p>
                <Link
                  href="/stays"
                  className="inline-block mt-4 text-night hover:text-gray-700 text-sm font-medium"
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {hotels.map((hotel, idx) => {
                  const heroPhoto = hotelHeroPhotoUrl(hotel)
                  const detailHref = stayDetailUrl(hotel.id, staySearch)
                  const previewReason = stayPreviewReason(hotel)

                  return (
                    <Link
                      key={hotel.id}
                      href={detailHref}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col"
                    >
                      <div className="relative">
                        <StayCardImage
                          src={heroPhoto}
                          alt={hotel.name}
                          island={hotel.island}
                          propertyType={hotel.property_type_name}
                          priority={idx < 6}
                        />
                        {hotel.star_rating != null && hotel.star_rating > 0 && (
                          <div className="absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 bg-white/90 text-night backdrop-blur-sm">
                            {hotel.star_rating}-star
                          </div>
                        )}
                        {hotel.review_score != null && hotel.review_score > 0 && (
                          <div className="absolute top-3 right-3 inline-flex items-center bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                            <span className="text-xs font-bold text-gray-700">
                              Rating {hotel.review_score.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-1">
                          {hotel.name}
                        </h2>

                        <div className="flex items-center gap-2 mt-1">
                          {hotel.property_type_name && (
                            <span className="text-[11px] font-semibold text-charcoal bg-gray-100 px-2 py-0.5 rounded-full">
                              {hotel.property_type_name}
                            </span>
                          )}
                          {hotel.island && (
                            <span className="text-xs text-gray-400">
                              {hotel.island}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          {hotel.star_rating != null && hotel.star_rating > 0 && (
                            <StarBadge stars={hotel.star_rating} />
                          )}
                          {hotel.review_count != null && hotel.review_count > 0 && (
                            <span className="text-xs text-gray-400">
                              {hotel.review_count.toLocaleString()} reviews
                            </span>
                          )}
                        </div>

                        {hotel.amenities && hotel.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {hotel.amenities.slice(0, 3).map((a) => (
                              <span
                                key={a}
                                className="text-xs bg-gray-100 text-charcoal rounded-full px-3 py-0.5 font-medium"
                              >
                                {a}
                              </span>
                            ))}
                            {hotel.amenities.length > 3 && (
                              <span className="text-xs text-gray-400 self-center">
                                +{hotel.amenities.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
                            Why Buddy picked this
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-charcoal">
                            {previewReason}
                          </p>
                        </div>

                        <div className="mt-auto pt-4">
                          <span className="text-sm font-semibold text-night group-hover:text-gray-700 transition-colors">
                            Check availability
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <StayDealsSection deals={stayDeals} />
        <StayFaqSection />

        <section
          aria-labelledby="stay-next-actions-title"
          className="mt-12 rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
                Ready to plan
              </p>
              <h2 id="stay-next-actions-title" className="mt-1 text-2xl font-extrabold text-night">
                Turn this stay shortlist into a Bahamas trip
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
                Start a trip, compare star-led stays, or review active accommodation offers without sending the traveler back through chat first.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[28rem]">
              <Link
                href="/dashboard/trips/new?returnTo=%2Fstays&source=stay"
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-brand-700"
              >
                Start stay trip
              </Link>
              <Link
                href="/stays?sort=stars"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-extrabold text-night transition-colors hover:bg-gray-50"
              >
                Compare starred stays
              </Link>
              <Link
                href="/deals?type=accommodation"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-extrabold text-night transition-colors hover:bg-gray-50"
              >
                Review stay deals
              </Link>
              <Link
                href={buddyChatHref('Help me compare Bahamas stays')}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-extrabold text-night transition-colors hover:bg-gray-50"
              >
                Ask Buddy
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
