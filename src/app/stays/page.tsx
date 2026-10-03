import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import TrackView from "@/components/TrackView";
import SearchSummaryPanel from "@/components/marketplace/SearchSummaryPanel";
import StayCardImage from "@/components/stays/StayCardImage";
import TripStyleSortedList from "@/components/marketplace/TripStyleSortedList";
import {
  StaySearchDateRangeControl,
  StaySearchDestinationControl,
  StaySearchGuestRoomControl,
  StaySearchRailCell,
} from "@/components/stays/StaySearchBookingControls";
import { buddyChatHref } from "@/lib/buddy-chat";
import { hotelPriceTier, inferHotelTripStyles } from "@/lib/trip-styles";
import {
  getAmenityOptions,
  getCityOptions,
  getFeaturedStayHotels,
  getHotels,
  getIslandOptions,
  getLiveHotelPhotoUrls,
  getStayStartingRates,
  getPropertyTypes,
  hotelHeroPhotoUrl,
  hotelPhotoUrls,
  type HotelStartingRate,
  uniqueHotelPhotoUrls,
} from "@/lib/hotels";
import {
  readStaySearchParams,
  stayAmenityUrlValue,
  stayDateRangeLabel,
  stayDetailUrl,
  stayRoomsLabel,
  staySearchUrl,
  stayTravelerLabel,
} from "@/lib/stay-search-params";
import { getStayTypeFilterOptions } from "@/lib/stay-property-types";
import {
  STAY_TRAVELER_TYPE_OPTIONS,
  stayTravelerTypeLabel,
} from "@/lib/stay-traveler-types";

export const metadata: Metadata = {
  title: "Book Bahamas Hotels & Stays",
  description:
    "Browse 700+ Bahamas hotels, villas, and apartments. Check live availability, compare rates, and book your perfect stay.",
  openGraph: {
    title: "Book Bahamas Hotels & Stays | Baha Buddy",
    description:
      "Find and book the perfect Bahamas stay with hotels, villas, and apartments with live rates.",
  },
};

export const revalidate = 3600;

const DEFAULT_STAY_LIMIT = 6;
const LIST_GALLERY_ENRICHMENT_LIMIT = 8;
const LIST_RATE_LOOKUP_LIMIT = 24;
const DEFAULT_STAY_ISLAND_LABEL =
  "Nassau, Exuma, Harbour Island, Abaco, and Bimini";
function StaySidebarChoice({
  href,
  active,
  label,
  detail,
}: {
  href: string;
  active: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`group flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 ${
        active
          ? "border-brand-200 bg-brand-50 text-night"
          : "border-gray-100 bg-white text-charcoal hover:border-gray-200 hover:bg-gray-50 hover:text-night"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-5">{label}</span>
        {detail && (
          <span className="mt-0.5 block text-xs font-medium leading-4 text-gray-500">
            {detail}
          </span>
        )}
      </span>
      {!active && (
        <span
          className="text-gray-300 transition-colors group-hover:text-brand-600"
          aria-hidden="true"
        >
          →
        </span>
      )}
    </Link>
  );
}

function StaySidebarDisclosure({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group border-t border-gray-100 py-3" open={open}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-1 text-sm font-semibold text-night [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span
          className="text-lg leading-none text-gray-400 group-open:rotate-45"
          aria-hidden="true"
        >
          +
        </span>
      </summary>
      <div className="mt-2 grid gap-2">{children}</div>
    </details>
  );
}

function formatStayCardMoney(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString()}`;
  }
}

function StayCardRateBlock({
  rate,
  hasDates,
}: {
  rate?: HotelStartingRate;
  hasDates: boolean;
}) {
  if (rate) {
    return (
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-gray-500">
          From
        </p>
        <p className="mt-0.5 text-lg font-bold leading-6 text-night">
          {formatStayCardMoney(rate.currency, rate.nightly)}
          <span className="text-xs font-semibold text-gray-500"> / night</span>
        </p>
        <p className="mt-0.5 text-xs font-semibold text-gray-500">
          {formatStayCardMoney(rate.currency, rate.total)} total · {rate.nights}{" "}
          night{rate.nights === 1 ? "" : "s"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="mt-0.5 text-sm font-bold leading-6 text-night">
        {hasDates ? "Check availability" : "Select dates"}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-gray-500">
        {hasDates
          ? "Price not yet available"
          : "Add dates to compare live rates"}
      </p>
    </div>
  );
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: {
    island?: string;
    city?: string;
    type?: string;
    traveler_type?: string;
    stars?: string;
    guest_rating?: string;
    amenities?: string;
    sort?: string;
    checkin?: string;
    checkout?: string;
    adults?: string;
    children?: string;
    rooms?: string;
  };
}) {
  const staySearch = readStaySearchParams(searchParams);
  const activeIsland = staySearch.island;
  const activeCity = staySearch.city;
  const activeType = staySearch.type;
  const activeTravelerType = staySearch.travelerType;
  const activeTravelerTypeLabel = stayTravelerTypeLabel(activeTravelerType);
  const minStars = staySearch.minStars;
  const minGuestRating = staySearch.minGuestRating;
  const activeAmenities = staySearch.amenities;
  const sortBy = staySearch.sort;
  const dateRangeLabel = stayDateRangeLabel(staySearch);
  const travelerLabel = stayTravelerLabel(staySearch);
  const roomsLabel = stayRoomsLabel(staySearch);
  const hasActiveStaySearch = Boolean(
    activeIsland ||
    activeCity ||
    activeType ||
    activeTravelerType ||
    minStars ||
    minGuestRating ||
    activeAmenities.length > 0 ||
    staySearch.checkin ||
    staySearch.checkout ||
    staySearch.adults ||
    staySearch.children != null ||
    staySearch.rooms ||
    sortBy === "rating",
  );
  const isDefaultStayFeed = !hasActiveStaySearch;

  const [
    initialHotels,
    islands,
    cities,
    propertyTypes,
    amenityOptions,
  ] = await Promise.all([
    isDefaultStayFeed
      ? getFeaturedStayHotels(DEFAULT_STAY_LIMIT)
      : getHotels({
          island: activeIsland || undefined,
          city: activeCity || undefined,
          propertyType: activeType || undefined,
          travelerType: activeTravelerType || undefined,
          minStars:
            minStars && minStars >= 1 && minStars <= 5 ? minStars : undefined,
          minGuestRating,
          amenities: activeAmenities,
          sort: sortBy as "rating" | "stars",
        }),
    getIslandOptions(),
    getCityOptions(activeIsland || undefined),
    getPropertyTypes(),
    getAmenityOptions(),
  ]);
  const hotels =
    isDefaultStayFeed && initialHotels.length === 0
      ? await getHotels({ sort: "stars" })
      : initialHotels;
  const hasStayDates = Boolean(staySearch.checkin && staySearch.checkout);
  const [enrichedGalleryEntries, stayStartingRates] = await Promise.all([
    Promise.all(
      hotels.slice(0, LIST_GALLERY_ENRICHMENT_LIMIT).map(async (hotel) => {
        const cachedPhotoUrls = hotelPhotoUrls(hotel);
        if (cachedPhotoUrls.length > 1)
          return [hotel.id, cachedPhotoUrls] as const;

        const livePhotoUrls = await getLiveHotelPhotoUrls(hotel.id, 8);
        return [
          hotel.id,
          uniqueHotelPhotoUrls(cachedPhotoUrls, livePhotoUrls),
        ] as const;
      }),
    ),
    hasStayDates
      ? getStayStartingRates({
          hotelIds: hotels.map((hotel) => hotel.id),
          checkin: staySearch.checkin,
          checkout: staySearch.checkout,
          adults: staySearch.adults,
          children: staySearch.children,
          limit: LIST_RATE_LOOKUP_LIMIT,
        })
      : Promise.resolve(new Map<string, HotelStartingRate>()),
  ]);
  const resultGalleryPhotos = new Map(enrichedGalleryEntries);

  function buildFilterUrl(overrides: Record<string, string | undefined>) {
    return staySearchUrl(staySearch, overrides);
  }

  function toggleAmenityUrl(amenity: string) {
    const next = activeAmenities.includes(amenity)
      ? activeAmenities.filter((value) => value !== amenity)
      : [...activeAmenities, amenity];
    return buildFilterUrl({ amenities: stayAmenityUrlValue(next) });
  }

  const visibleAmenityOptions = Array.from(
    new Set([...activeAmenities, ...amenityOptions]),
  ).slice(0, 14);
  const selectableIslands =
    activeIsland && !islands.includes(activeIsland)
      ? [activeIsland, ...islands]
      : islands;
  const selectableCities =
    activeCity && !cities.includes(activeCity)
      ? [activeCity, ...cities]
      : cities;
  const providerPropertyTypes =
    activeType && !propertyTypes.includes(activeType)
      ? [activeType, ...propertyTypes]
      : propertyTypes;
  const selectablePropertyTypes = getStayTypeFilterOptions(
    providerPropertyTypes,
  );
  const activeFilters = [
    activeType
      ? {
          label: "Stay type",
          value: activeType,
          href: buildFilterUrl({ type: undefined }),
        }
      : null,
    activeTravelerTypeLabel
      ? {
          label: "Best for",
          value: activeTravelerTypeLabel,
          href: buildFilterUrl({ traveler_type: undefined }),
        }
      : null,
    minStars
      ? {
          label: "Star class",
          value: `${minStars}+ star`,
          href: buildFilterUrl({ stars: undefined }),
        }
      : null,
    minGuestRating
      ? {
          label: "Guest score",
          value: `${minGuestRating}+`,
          href: buildFilterUrl({ guest_rating: undefined }),
        }
      : null,
    ...activeAmenities.map((amenity) => ({
      label: "Amenity",
      value: amenity,
      href: buildFilterUrl({
        amenities: stayAmenityUrlValue(
          activeAmenities.filter((value) => value !== amenity),
        ),
      }),
    })),
    sortBy === "rating"
      ? {
          label: "Sort",
          value: "Top rated",
          href: buildFilterUrl({ sort: undefined }),
        }
      : null,
  ].filter((item): item is { label: string; value: string; href: string } =>
    Boolean(item),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: activeIsland
      ? `Hotels in ${activeIsland}, Bahamas`
      : isDefaultStayFeed
        ? `Best starred stays in ${DEFAULT_STAY_ISLAND_LABEL}`
        : "Hotels & Stays in the Bahamas",
    numberOfItems: hotels.length,
    itemListElement: hotels.slice(0, 20).map((h, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LodgingBusiness",
        name: h.name,
        ...(h.star_rating != null &&
          h.star_rating > 0 && {
            starRating: { "@type": "Rating", ratingValue: h.star_rating },
          }),
        ...(h.review_score != null &&
          h.review_score > 0 && {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: h.review_score,
              reviewCount: h.review_count ?? 0,
            },
          }),
      },
    })),
  };

  const renderAdvancedFilters = () => (
    <>
      {selectablePropertyTypes.length > 0 && (
        <StaySidebarDisclosure title="Stay type" open={Boolean(activeType)}>
          <StaySidebarChoice
            href={buildFilterUrl({ type: undefined })}
            active={!activeType}
            label="All stay types"
          />
          {selectablePropertyTypes.map((type) => (
            <StaySidebarChoice
              key={type}
              href={buildFilterUrl({ type })}
              active={activeType === type}
              label={type}
            />
          ))}
        </StaySidebarDisclosure>
      )}

      <StaySidebarDisclosure
        title="Traveler fit"
        open={Boolean(activeTravelerType)}
      >
        <StaySidebarChoice
          href={buildFilterUrl({ traveler_type: undefined })}
          active={!activeTravelerType}
          label="Any traveler"
        />
        {STAY_TRAVELER_TYPE_OPTIONS.map((option) => (
          <StaySidebarChoice
            key={option.value}
            href={buildFilterUrl({ traveler_type: option.value })}
            active={activeTravelerType === option.value}
            label={option.label}
          />
        ))}
      </StaySidebarDisclosure>

      <StaySidebarDisclosure
        title="Quality"
        open={Boolean(minStars || minGuestRating)}
      >
        <StaySidebarChoice
          href={buildFilterUrl({ stars: undefined, guest_rating: undefined })}
          active={!minStars && !minGuestRating}
          label="Any quality"
        />
        {[4, 5].map((stars) => (
          <StaySidebarChoice
            key={stars}
            href={buildFilterUrl({
              stars: minStars === stars ? undefined : String(stars),
            })}
            active={minStars === stars}
            label={`${stars}+ star`}
          />
        ))}
        {[8, 9].map((score) => (
          <StaySidebarChoice
            key={score}
            href={buildFilterUrl({
              guest_rating:
                minGuestRating === score ? undefined : String(score),
            })}
            active={minGuestRating === score}
            label={`${score}+ guest rating`}
          />
        ))}
      </StaySidebarDisclosure>

      {visibleAmenityOptions.length > 0 && (
        <StaySidebarDisclosure
          title="Must-haves"
          open={activeAmenities.length > 0}
        >
          <StaySidebarChoice
            href={buildFilterUrl({ amenities: undefined })}
            active={activeAmenities.length === 0}
            label="Any features"
          />
          {visibleAmenityOptions.map((amenity) => (
            <StaySidebarChoice
              key={amenity}
              href={toggleAmenityUrl(amenity)}
              active={activeAmenities.includes(amenity)}
              label={amenity}
            />
          ))}
        </StaySidebarDisclosure>
      )}

      <StaySidebarDisclosure title="Sort" open={sortBy === "rating"}>
        <StaySidebarChoice
          href={buildFilterUrl({ sort: undefined })}
          active={sortBy === "stars"}
          label="Star rating"
        />
        <StaySidebarChoice
          href={buildFilterUrl({ sort: "rating" })}
          active={sortBy === "rating"}
          label="Top rated"
        />
      </StaySidebarDisclosure>
    </>
  );

  const clearRefinementsUrl = buildFilterUrl({
    type: undefined, traveler_type: undefined, stars: undefined,
    guest_rating: undefined, amenities: undefined, sort: undefined,
  });

  return (
    <div className="min-h-screen bg-white">
      <TrackView
        event="stays_directory_viewed"
        props={{
          island_filter: activeIsland || "all",
          area_filter: activeCity || "all",
          type_filter: activeType || "all",
          traveler_type_filter: activeTravelerType || "all",
          stars_filter: minStars ?? "any",
          guest_rating_filter: minGuestRating ?? "any",
          amenities_filter: activeAmenities,
          sort: sortBy,
          hotel_count: hotels.length,
          feed_mode: isDefaultStayFeed
            ? "featured_starter_islands"
            : "filtered_search",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
        <header>
          <h1 className="text-3xl font-bold text-night">Find stays</h1>
          <p className="mt-2 text-sm text-gray-600">Find your island base. Add dates to compare live rates.</p>
        </header>
        <SearchSummaryPanel
          key={[activeIsland, activeCity, staySearch.checkin, staySearch.checkout, staySearch.adults, staySearch.rooms].join('|')}
          summary={activeCity ? `${activeCity}, ${activeIsland || "The Bahamas"}` : activeIsland || "The Bahamas"}
          detail={[dateRangeLabel || "Add dates", travelerLabel || "Add guests", roomsLabel].filter(Boolean).join(" · ")}
          defaultOpen={!hasStayDates}
        >
        <form
          action="/stays"
          method="get"
          aria-label="Search stays"

        >
          {activeType ? <input type="hidden" name="type" value={activeType} /> : null}
          {minStars ? (
            <input type="hidden" name="stars" value={String(minStars)} />
          ) : null}
          {activeTravelerType ? (
            <input
              type="hidden"
              name="traveler_type"
              value={activeTravelerType}
            />
          ) : null}
          {minGuestRating ? (
            <input
              type="hidden"
              name="guest_rating"
              value={String(minGuestRating)}
            />
          ) : null}
          {activeAmenities.length > 0 ? (
            <input
              type="hidden"
              name="amenities"
              value={activeAmenities.join(",")}
            />
          ) : null}
          {sortBy === "rating" ? (
            <input type="hidden" name="sort" value="rating" />
          ) : null}
          {staySearch.children ? (
            <input
              type="hidden"
              name="children"
              value={String(staySearch.children)}
            />
          ) : null}

            <div
              data-testid="stay-primary-search-row"
              className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <StaySearchRailCell label="Destination" icon="pin">
                <StaySearchDestinationControl
                  island={activeIsland}
                  city={activeCity}
                  islandOptions={selectableIslands}
                  cityOptions={selectableCities}
                />
              </StaySearchRailCell>

              <StaySearchRailCell label="Dates" icon="calendar">
                <StaySearchDateRangeControl
                  checkin={staySearch.checkin}
                  checkout={staySearch.checkout}
                />
              </StaySearchRailCell>

              <StaySearchRailCell label="Travelers" icon="guests">
                <StaySearchGuestRoomControl
                  adults={staySearch.adults}
                  rooms={staySearch.rooms}
                />
              </StaySearchRailCell>

              <button
                type="submit"
                className="inline-flex h-full min-h-14 w-full items-center justify-center rounded-2xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 md:col-span-2 xl:col-span-1 xl:min-h-16 xl:min-w-32"
              >
                Search
              </button>
            </div>
        </form>
        </SearchSummaryPanel>

        <div className="space-y-5">
          <details className="group/filters rounded-baha-lg border border-gray-200 bg-white">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-baha-lg px-4 py-3 text-sm font-semibold text-night focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 [&::-webkit-details-marker]:hidden">
              <span>Filters &amp; sort{activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}</span>
              <span aria-hidden="true" className="text-brand-700 group-open/filters:rotate-45">+</span>
            </summary>
            <div className="grid gap-x-6 border-t border-gray-100 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3">
              {renderAdvancedFilters()}
            </div>
          </details>
          {activeFilters.length > 0 && (
            <nav aria-label="Active stay filters" className="flex flex-wrap items-center gap-2">
              {activeFilters.map(filter => (
                <Link key={filter.label + filter.value} href={filter.href} aria-label={`Remove ${filter.label}: ${filter.value}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-50 px-3 text-sm text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600">
                  {filter.value}<span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href={clearRefinementsUrl} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand-700 underline underline-offset-4">Clear filters</Link>
            </nav>
          )}

          <section aria-label="Stay results" className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-night">{hotels.length} stay{hotels.length === 1 ? "" : "s"}{activeIsland ? ` in ${activeIsland}` : ""}</h2>
              <p className="text-sm text-gray-600">{isDefaultStayFeed ? "Featured stays" : `Sorted by ${sortBy === "stars" ? "star rating" : "guest rating"}`}</p>
            </div>

            {hotels.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg font-medium text-gray-600">
                  No stays found
                </p>
                <p className="text-sm mt-2">
                  Try another destination or clear a filter.
                </p>
                <Link
                  href={activeFilters.length ? clearRefinementsUrl : "/stays"}
                  className="inline-block mt-4 text-night hover:text-gray-700 text-sm font-medium"
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <TripStyleSortedList
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                items={hotels.map((hotel, idx) => {
                  const photoUrls =
                    resultGalleryPhotos.get(hotel.id) ?? hotelPhotoUrls(hotel);
                  const heroPhoto = photoUrls[0] ?? hotelHeroPhotoUrl(hotel);
                  const detailHref = stayDetailUrl(hotel.id, staySearch);
                  const startingRate = stayStartingRates.get(hotel.id);

                  return {
                    key: hotel.id,
                    // `hotels` rows carry no trip_styles; the fit is derived
                    // from the card's own facts, for client ordering only.
                    tripStyles: inferHotelTripStyles(hotel),
                    priceTier: hotelPriceTier(hotel.star_rating),
                    node: (
                    <article
                      className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col"
                    >
                      <div className="relative">
                        <StayCardImage
                          src={heroPhoto}
                          photos={photoUrls}
                          alt={hotel.name}
                          island={hotel.island}
                          propertyType={hotel.property_type_name}
                          href={detailHref}
                          priority={idx < 6}
                        />
                      </div>

                      <div className="p-4 flex flex-col flex-1 gap-1">
                        <h2 className="text-base font-bold text-gray-900 leading-snug">
                          <Link
                            href={detailHref}
                            className="transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2"
                          >
                            {hotel.name}
                          </Link>
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {hotel.property_type_name && (
                            <span className="text-xs font-semibold text-charcoal bg-gray-100 px-2 py-0.5 rounded-full">
                              {hotel.property_type_name}
                            </span>
                          )}
                          {hotel.island && (
                            <span className="text-xs text-gray-400">
                              {hotel.island}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          {hotel.star_rating != null && hotel.star_rating > 0 && <span>{hotel.star_rating}-star</span>}
                          {hotel.review_score != null && hotel.review_score > 0 && <span className="font-semibold text-night">Guest rating {hotel.review_score.toFixed(1)}</span>}
                          {hotel.review_count != null && hotel.review_count > 0 && <span>({hotel.review_count.toLocaleString()} reviews)</span>}
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

                        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-gray-100 pt-4">
                          <StayCardRateBlock
                            rate={startingRate}
                            hasDates={hasStayDates}
                          />
                          <Link
                            href={detailHref}
                            className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-gray-300 px-3 py-2 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2"
                          >
                            View stay
                          </Link>
                        </div>
                      </div>
                    </article>
                    ),
                  };
                })}
              />
            )}
          </section>

        </div>
        <p className="border-t border-gray-100 py-5 text-sm text-gray-600">
          Need help choosing? <Link href={buddyChatHref("Help me compare Bahamas stays")} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">Ask Buddy</Link>
        </p>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}
