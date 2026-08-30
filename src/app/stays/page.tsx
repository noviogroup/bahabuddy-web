import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import TrackView from "@/components/TrackView";
import ImageWithSourcePolicy from "@/components/marketplace/ImageWithSourcePolicy";
import { TravelSearchSelect } from "@/components/marketplace/TravelSearchFields";
import StayCardImage from "@/components/stays/StayCardImage";
import {
  STAY_COMPACT_SEARCH_CONTROL_CLASS_NAME,
  StaySearchDateRangeControl,
  StaySearchDestinationControl,
  StaySearchGuestRoomControl,
  StaySearchRailCell,
} from "@/components/stays/StaySearchBookingControls";
import { buddyChatHref } from "@/lib/buddy-chat";
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
import { getStayDeals, type StayDeal } from "@/lib/deals";
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
  title: "Book Bahamas Hotels & Stays | Baha Buddy",
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
const STAY_SEARCH_BACKGROUND_IMAGE =
  "/assets/marketplace/bahamas-stays-pool.jpg";
const FLIGHT_PROMO_BACKGROUND_IMAGE =
  "/assets/marketplace/bahamas-flight-aerial.jpg";

function StarBadge({ stars }: { stars: number }) {
  return (
    <span className="text-charcoal text-xs font-semibold leading-none">
      {Math.floor(stars)}-star
    </span>
  );
}

function StaySidebarSection({
  label,
  description,
  children,
  listClassName = "",
}: {
  label: string;
  description?: string;
  children: ReactNode;
  listClassName?: string;
}) {
  return (
    <section className="border-t border-gray-100 py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-gray-500">
          {label}
        </p>
      </div>
      {description && (
        <p className="mt-1 text-xs font-medium leading-5 text-gray-500">
          {description}
        </p>
      )}
      <div className={`mt-3 grid gap-2 ${listClassName}`}>{children}</div>
    </section>
  );
}

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
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-1 text-sm font-semibold text-night [&::-webkit-details-marker]:hidden">
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

function stayPreviewReason(hotel: {
  property_type_name: string | null;
  island: string | null;
  star_rating: number | null;
  review_score: number | null;
  amenities: string[];
}): string {
  if (hotel.star_rating && hotel.star_rating >= 4) {
    return `${Math.floor(hotel.star_rating)}-star ${hotel.property_type_name ?? "stay"}${hotel.island ? ` in ${hotel.island}` : ""} with stronger resort-class signals.`;
  }
  if (hotel.review_score && hotel.review_score >= 8) {
    return `High guest score${hotel.island ? ` for ${hotel.island}` : ""}, useful for shortlisting before checking rates.`;
  }
  if (hotel.amenities.length > 0) {
    return `Matches key stay needs: ${hotel.amenities.slice(0, 2).join(" and ")}.`;
  }
  return `Real ${hotel.property_type_name ?? "stay"} listing to compare before checking availability.`;
}

function formatDealPrice(price: number | null, unit: string | null): string {
  if (!price) return "Check offer";
  const units: Record<string, string> = {
    per_night: "/night",
    per_person: "/person",
    per_day: "/day",
    per_charter: "/charter",
    total: " total",
  };
  return `From $${price.toLocaleString()}${unit ? (units[unit] ?? "") : ""}`;
}

function formatStayCardMoney(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
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
          Starting from
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
      <p className="text-xs font-semibold uppercase text-gray-500">
        Starting from
      </p>
      <p className="mt-0.5 text-sm font-bold leading-6 text-night">
        {hasDates ? "Check availability" : "Select dates"}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-gray-500">
        {hasDates
          ? "Open stay for live rooms"
          : "Add dates to compare live rates"}
      </p>
    </div>
  );
}

function StayDealsSection({ deals }: { deals: StayDeal[] }) {
  return (
    <section
      aria-labelledby="stay-deals-title"
      className="mt-10 rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">
            Stay deals
          </p>
          <h2
            id="stay-deals-title"
            className="mt-1 text-2xl font-bold text-night"
          >
            Bahamas stay offers worth checking
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-charcoal">
            Live accommodation deals appear here when partner offers are active.
            Booking still happens through the stay detail and checkout flow.
          </p>
        </div>
        <Link
          href="/deals?type=accommodation"
          className="inline-flex w-fit items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-night transition-colors hover:bg-gray-50"
        >
          View all stay deals
        </Link>
      </div>

      {deals.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {deals.map((deal) => (
            <article
              key={deal.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <ImageWithSourcePolicy
                src={deal.image_url}
                alt={deal.title}
                title={deal.title}
                eyebrow="Stay deal"
                className="h-40"
                imageClassName="object-cover transition-transform duration-500 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
                tone="deal"
              >
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-night shadow-sm">
                  Stay deal
                </div>
              </ImageWithSourcePolicy>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold leading-snug text-night">
                    {deal.title}
                  </h3>
                  <p className="shrink-0 text-right text-sm font-bold text-night">
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
                      <span
                        key={highlight}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-charcoal"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  {deal.island && (
                    <span className="text-xs font-medium text-gray-500">
                      {deal.island.replace(/-/g, " ")}
                    </span>
                  )}
                  <Link
                    href={`/deals?type=${encodeURIComponent(deal.deal_type)}`}
                    className="ml-auto text-xs font-semibold text-night underline underline-offset-4"
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
          <p className="text-sm font-semibold text-night">
            No active stay deals are loaded right now.
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-charcoal">
            You can still compare the best starred stays above, or open the
            deals page to check package and activity offers.
          </p>
        </div>
      )}
    </section>
  );
}

function StayFaqSection() {
  const faqs = [
    {
      question: "Why start with these islands?",
      answer:
        "Nassau, Exuma, Harbour Island, Abaco, and Bimini cover many first Bahamas stay searches.",
    },
    {
      question: "How are stays selected?",
      answer:
        "Baha Buddy prioritizes active stays by star rating, guest score, reviews, and photo quality.",
    },
    {
      question: "Can travelers filter by homes, villas, apartments, or hotels?",
      answer:
        "Yes. Filter by hotels, resorts, villas, homes, apartments, condos, and related stay types.",
    },
    {
      question: "When does booking require an account?",
      answer:
        "Browsing is public. Saving to a trip and checking out require a signed-in traveler account.",
    },
  ];

  return (
    <section
      aria-labelledby="stay-faq-title"
      className="mt-6 rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-xs font-semibold uppercase text-gray-500">FAQ</p>
      <h2 id="stay-faq-title" className="mt-1 text-2xl font-bold text-night">
        Stays FAQ
      </h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <h3 className="text-sm font-bold text-night">{faq.question}</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-charcoal">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
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
    stayDeals,
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
    getStayDeals(3),
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
  const hasBeachAmenity = activeAmenities.includes("Beachfront");
  const hasAdvancedFilters = Boolean(
    activeIsland ||
    activeCity ||
    activeAmenities.length > 0 ||
    sortBy === "rating",
  );
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
  const popularStayTypes = getStayTypeFilterOptions(selectablePropertyTypes)
    .filter((type) =>
      [
        "Hotel",
        "Resort",
        "Villa",
        "Home",
        "House",
        "Apartment",
        "Condo",
      ].includes(type),
    )
    .slice(0, 7);
  const stayDestinationLabel = activeCity || activeIsland || "The Bahamas";
  const stayTypeLabel = activeType
    ? `${activeType.toLowerCase()} stays`
    : "stays";
  const quickFilters = [
    {
      label: "Recommended",
      href: buildFilterUrl({
        type: undefined,
        traveler_type: undefined,
        stars: undefined,
        guest_rating: undefined,
        amenities: undefined,
        sort: undefined,
      }),
      active:
        !activeType &&
        !activeTravelerType &&
        !minStars &&
        !minGuestRating &&
        activeAmenities.length === 0 &&
        sortBy === "stars",
    },
    {
      label: "Beach stays",
      href: buildFilterUrl({
        amenities: hasBeachAmenity ? undefined : "Beachfront",
      }),
      active: hasBeachAmenity,
    },
    {
      label: "Family friendly",
      href: buildFilterUrl({
        traveler_type:
          activeTravelerType === "families" ? undefined : "families",
      }),
      active: activeTravelerType === "families",
    },
    {
      label: "Luxury",
      href: buildFilterUrl({ stars: minStars === 5 ? undefined : "5" }),
      active: minStars === 5,
    },
    {
      label: "Villas & homes",
      href: buildFilterUrl({
        type: activeType === "Villa" ? undefined : "Villa",
      }),
      active: ["Villa", "Home", "House"].includes(activeType),
    },
  ];
  const quickFilterDetails: Record<string, string> = {
    Recommended: "Balanced picks across islands.",
    "Beach stays": "Easy beach access first.",
    "Family friendly": "More room and calmer pacing.",
    Luxury: "Higher-end stays first.",
    "Villas & homes": "Private stays with space.",
  };
  const visibleQuickFilters = quickFilters
    .filter(
      (filter) =>
        ["Recommended", "Beach stays", "Luxury"].includes(filter.label) ||
        filter.active,
    )
    .slice(0, 4);
  const popularStayTypeLinks = [
    {
      label: "All stays",
      href: buildFilterUrl({ type: undefined }),
      active: !activeType,
    },
    ...popularStayTypes.map((type) => ({
      label: type,
      href: buildFilterUrl({ type }),
      active: activeType === type,
    })),
  ];

  const activeFilters = [
    activeIsland
      ? {
          label: "Island",
          value: activeIsland,
          href: buildFilterUrl({ island: undefined }),
        }
      : null,
    activeCity
      ? {
          label: "Area",
          value: activeCity,
          href: buildFilterUrl({ city: undefined }),
        }
      : null,
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
    dateRangeLabel
      ? {
          label: "Dates",
          value: dateRangeLabel,
          href: buildFilterUrl({ checkin: undefined, checkout: undefined }),
        }
      : null,
    travelerLabel
      ? {
          label: "Travelers",
          value: travelerLabel,
          href: buildFilterUrl({ adults: undefined, children: undefined }),
        }
      : null,
    roomsLabel
      ? {
          label: "Rooms",
          value: roomsLabel,
          href: buildFilterUrl({ rooms: undefined }),
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

  const renderQuickFilters = () => (
    <StaySidebarSection label="Best next move">
      {visibleQuickFilters.map((filter) => (
        <StaySidebarChoice
          key={filter.label}
          href={filter.href}
          active={filter.active}
          label={filter.label}
          detail={quickFilterDetails[filter.label]}
        />
      ))}
    </StaySidebarSection>
  );

  const renderAdvancedFilters = () => (
    <>
      {selectableIslands.length > 0 && (
        <StaySidebarDisclosure title="Island" open={Boolean(activeIsland)}>
          <StaySidebarChoice
            href={buildFilterUrl({ island: undefined })}
            active={!activeIsland}
            label="All islands"
          />
          {selectableIslands.map((name) => (
            <StaySidebarChoice
              key={name}
              href={buildFilterUrl({ island: name, city: undefined })}
              active={activeIsland === name}
              label={name}
            />
          ))}
        </StaySidebarDisclosure>
      )}

      {selectableCities.length > 0 && (
        <StaySidebarDisclosure title="Area" open={Boolean(activeCity)}>
          <StaySidebarChoice
            href={buildFilterUrl({ city: undefined })}
            active={!activeCity}
            label="All areas"
            detail={activeIsland ? `Within ${activeIsland}` : "Provider areas"}
          />
          <div
            className={
              selectableCities.length > 18
                ? "grid max-h-72 gap-2 overflow-y-auto overscroll-contain pr-1"
                : "grid gap-2"
            }
          >
            {selectableCities.map((city) => (
              <StaySidebarChoice
                key={city}
                href={buildFilterUrl({ city })}
                active={activeCity === city}
                label={city}
              />
            ))}
          </div>
        </StaySidebarDisclosure>
      )}

      {popularStayTypes.length > 0 && (
        <StaySidebarDisclosure title="Stay type" open={false}>
          <StaySidebarChoice
            href={buildFilterUrl({ type: undefined })}
            active={!activeType}
            label="All stay types"
          />
          {popularStayTypes.map((type) => (
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
            label={`${score}+ reviews`}
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

  const renderFilterControls = () => (
    <>
      {renderQuickFilters()}
      <details
        className="group border-t border-gray-100 pt-4"
        open={hasAdvancedFilters}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-night [&::-webkit-details-marker]:hidden">
          <span>Refine results</span>
          <span className="text-xs font-medium text-gray-500 group-open:hidden">
            Open
          </span>
          <span className="hidden text-xs font-medium text-gray-500 group-open:inline">
            Close
          </span>
        </summary>
        <div className="mt-1">{renderAdvancedFilters()}</div>
      </details>
    </>
  );

  const renderActiveFilters = (clearLabel = "Clear all") =>
    activeFilters.length > 0 ? (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Current search
          </p>
          <Link
            href="/stays"
            className="text-xs font-semibold text-night hover:text-brand-700"
          >
            {clearLabel}
          </Link>
        </div>
        <div className="mt-2 grid gap-1.5">
          {activeFilters.slice(0, 4).map((filter) => (
            <Link
              key={`${filter.label}-${filter.value}`}
              href={filter.href}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-charcoal ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-night"
            >
              <span className="min-w-0">
                <span className="block uppercase text-gray-400">
                  {filter.label}
                </span>
                <span className="mt-0.5 block truncate text-sm text-night">
                  {filter.value}
                </span>
              </span>
              <span className="shrink-0 text-gray-400" aria-hidden="true">
                Remove
              </span>
            </Link>
          ))}
          {activeFilters.length > 4 && (
            <p className="px-1 pt-1 text-xs font-semibold text-gray-500">
              +{activeFilters.length - 4} more refinement
              {activeFilters.length - 4 === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>
    ) : (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <p className="text-xs font-semibold uppercase text-gray-500">
          Current search
        </p>
        <p className="mt-1 text-sm font-semibold text-night">
          {isDefaultStayFeed ? "Starter picks" : "All stays"}
        </p>
      </div>
    );

  const renderFilterPanelBody = (
    clearLabel = "Clear all",
    includeControls = true,
  ) => (
    <div className="space-y-1 px-4 pb-4">
      <div className="pt-4">{renderActiveFilters(clearLabel)}</div>
      {includeControls && renderFilterControls()}
    </div>
  );

  const renderStayPromoAside = () => (
    <aside
      aria-label="Stay promotions"
      className="hidden space-y-4 lg:sticky lg:top-24 lg:block"
    >
      <section
        aria-label="Sponsored Baha Buddy trip planning ad"
        className="overflow-hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm"
      >
        <div className="relative h-56 bg-gray-100">
          <Image
            src={STAY_SEARCH_BACKGROUND_IMAGE}
            alt=""
            fill
            className="object-cover"
            sizes="260px"
            unoptimized
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold uppercase text-night shadow-sm">
            Sponsored
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-night/80 px-2 py-1 text-xs font-bold uppercase text-white">
            Ad
          </span>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="rounded-2xl bg-white/95 p-3 shadow-lg shadow-gray-950/15 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase text-brand-700">
                Baha Buddy
              </p>
              <h2 className="mt-1 text-xl font-bold leading-tight text-night">
                Build the trip around this stay.
              </h2>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm font-medium leading-6 text-charcoal">
            Pair {stayDestinationLabel} {stayTypeLabel} with flights, transfers,
            boat days, dining, and backup timing.
          </p>
          <Link
            href="/dashboard/trips/new?returnTo=%2Fstays&source=stay_search"
            className="inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Plan with Buddy
          </Link>
        </div>
      </section>

      <section
        aria-label="Sponsored flight planning ad"
        className="overflow-hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm"
      >
        <div className="relative h-36 bg-gray-100">
          <Image
            src={FLIGHT_PROMO_BACKGROUND_IMAGE}
            alt=""
            fill
            className="object-cover"
            sizes="260px"
            unoptimized
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold uppercase text-night shadow-sm">
            Ad
          </span>
        </div>
        <div className="p-4">
          <p className="text-xs font-bold uppercase text-gray-500">
            Bundle this trip
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-night">
            Add live flights before you pick the room.
          </h3>
          <p className="mt-2 text-sm font-medium leading-6 text-charcoal">
            Check arrival timing before the stay shortlist gets too far ahead.
          </p>
          <Link
            href="/flights"
            className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            Search flights
          </Link>
        </div>
      </section>
    </aside>
  );

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

      <main className="mx-auto max-w-7xl px-4 py-5">
        <form
          action="/stays"
          method="get"
          aria-label="Search stays"
          className="mb-5 flex min-h-80 flex-col overflow-visible rounded-baha-lg bg-night bg-cover bg-center p-3 shadow-sm md:min-h-96 md:p-5"
          style={{
            backgroundImage: `url("${STAY_SEARCH_BACKGROUND_IMAGE}")`,
            backgroundPosition: "center",
          }}
        >
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

          <div className="w-fit max-w-full rounded-baha-lg bg-white/95 px-4 py-3 shadow-lg shadow-gray-950/10 ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase text-brand-700">
              Baha Buddy stays
            </p>
            <h1 className="mt-1 text-3xl font-bold text-night">
              {activeIsland
                ? `Find stays in ${activeIsland}`
                : "Find stays in The Bahamas"}
            </h1>
          </div>

          <div className="mt-auto w-full rounded-baha-lg bg-white p-3 shadow-xl shadow-gray-950/15 ring-1 ring-black/5 md:p-4">
            <div
              data-testid="stay-primary-search-row"
              className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-[minmax(16rem,1.65fr)_minmax(14rem,1.2fr)_minmax(12rem,1fr)_minmax(10rem,0.85fr)_auto]"
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

              <StaySearchRailCell
                label="Stay type"
                htmlFor="stay-type"
                icon="bed"
              >
                <TravelSearchSelect
                  id="stay-type"
                  name="type"
                  aria-label="Stay type"
                  defaultValue={activeType}
                  className={STAY_COMPACT_SEARCH_CONTROL_CLASS_NAME}
                >
                  <option value="">All types</option>
                  {selectablePropertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </TravelSearchSelect>
              </StaySearchRailCell>

              <button
                type="submit"
                className="inline-flex h-full min-h-14 w-full items-center justify-center rounded-2xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 md:col-span-2 lg:col-span-1 lg:min-h-16 lg:min-w-32"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {popularStayTypes.length > 0 && (
          <nav
            aria-label="Popular stay type shortcuts"
            className="mb-5 rounded-baha-lg border border-gray-200 bg-white p-3 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase text-gray-500">
              Popular stay types
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {popularStayTypeLinks.map((type) => (
                <Link
                  key={type.label}
                  href={type.href}
                  aria-current={type.active ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 ${
                    type.active
                      ? "border-gray-900 bg-white text-night ring-2 ring-gray-100"
                      : "border-gray-200 bg-white text-charcoal hover:border-gray-300 hover:bg-gray-50 hover:text-night"
                  }`}
                >
                  {type.label}
                </Link>
              ))}
            </div>
          </nav>
        )}

        <div className="grid gap-5 lg:grid-cols-[18.5rem_minmax(0,1fr)_15.5rem] lg:items-start">
          <details
            className="rounded-baha-lg border border-gray-200 bg-white shadow-sm lg:hidden"
            open={activeFilters.length > 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-xs font-semibold uppercase text-gray-500">
                  Stay filters
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-night">
                  {activeFilters.length > 0
                    ? `${activeFilters.length} active refinement${activeFilters.length === 1 ? "" : "s"}`
                    : "Open filters"}
                </span>
              </span>
              <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                View
              </span>
            </summary>
            {renderFilterPanelBody("Clear filters")}
          </details>

          <aside
            aria-label="Stay filters"
            className="hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24 lg:block"
          >
            {renderFilterPanelBody()}
          </aside>

          <section aria-label="Stay results" className="min-w-0">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  {isDefaultStayFeed ? "Starter picks" : "Results"}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  {hotels.length} stay{hotels.length !== 1 ? "s" : ""}
                  {activeIsland ? ` in ${activeIsland}` : ""}
                  {activeCity ? ` | ${activeCity}` : ""}
                  {activeType ? ` | ${activeType}` : ""}
                  {activeTravelerTypeLabel
                    ? ` | ${activeTravelerTypeLabel}`
                    : ""}
                  {minStars ? ` | ${minStars}+ star` : ""}
                  {minGuestRating ? ` | ${minGuestRating}+ guest score` : ""}
                  {activeAmenities.length > 0
                    ? ` | ${activeAmenities.length} amenity ${activeAmenities.length === 1 ? "match" : "matches"}`
                    : ""}
                </p>
              </div>
              <p className="text-xs font-semibold text-gray-400">
                {isDefaultStayFeed
                  ? `Focused on ${DEFAULT_STAY_ISLAND_LABEL}`
                  : `Sorted by ${sortBy === "stars" ? "star rating" : "top rated"}`}
              </p>
            </div>

            {hotels.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg font-medium text-gray-600">
                  No stays found
                </p>
                <p className="text-sm mt-2">
                  Try a different island, area, stay type, traveler fit, star
                  class, guest score, amenity, or date range.
                </p>
                <Link
                  href="/stays"
                  className="inline-block mt-4 text-night hover:text-gray-700 text-sm font-medium"
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-1 min-[1220px]:grid-cols-2">
                {hotels.map((hotel, idx) => {
                  const photoUrls =
                    resultGalleryPhotos.get(hotel.id) ?? hotelPhotoUrls(hotel);
                  const heroPhoto = photoUrls[0] ?? hotelHeroPhotoUrl(hotel);
                  const detailHref = stayDetailUrl(hotel.id, staySearch);
                  const previewReason = stayPreviewReason(hotel);
                  const startingRate = stayStartingRates.get(hotel.id);

                  return (
                    <article
                      key={hotel.id}
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
                        {hotel.star_rating != null && hotel.star_rating > 0 && (
                          <div className="absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 bg-white/90 text-night backdrop-blur-sm">
                            {hotel.star_rating}-star
                          </div>
                        )}
                        {hotel.review_score != null &&
                          hotel.review_score > 0 && (
                            <div className="absolute top-3 right-3 inline-flex items-center bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                              <span className="text-xs font-semibold text-gray-700">
                                Rating {hotel.review_score.toFixed(1)}
                              </span>
                            </div>
                          )}
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-1">
                          <Link
                            href={detailHref}
                            className="transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2"
                          >
                            {hotel.name}
                          </Link>
                        </h2>

                        <div className="flex items-center gap-2 mt-1">
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

                        <div className="flex items-center gap-3 mt-2">
                          {hotel.star_rating != null &&
                            hotel.star_rating > 0 && (
                              <StarBadge stars={hotel.star_rating} />
                            )}
                          {hotel.review_count != null &&
                            hotel.review_count > 0 && (
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
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Why Buddy picked this
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-charcoal">
                            {previewReason}
                          </p>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
                          <StayCardRateBlock
                            rate={startingRate}
                            hasDates={hasStayDates}
                          />
                          <Link
                            href={detailHref}
                            className="shrink-0 rounded-full border border-gray-300 px-3 py-2 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2"
                          >
                            Check availability
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {renderStayPromoAside()}
        </div>

        <StayDealsSection deals={stayDeals} />
        <StayFaqSection />

        <section
          aria-labelledby="stay-next-actions-title"
          className="mt-12 rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Ready to plan
              </p>
              <h2
                id="stay-next-actions-title"
                className="mt-1 text-2xl font-bold text-night"
              >
                Turn this stay shortlist into a Bahamas trip
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
                Start a trip, compare star-led stays, or review active
                accommodation offers without sending the traveler back through
                chat first.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[28rem]">
              <Link
                href="/dashboard/trips/new?returnTo=%2Fstays&source=stay"
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Start stay trip
              </Link>
              <Link
                href="/stays?sort=stars"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-night transition-colors hover:bg-gray-50"
              >
                Compare starred stays
              </Link>
              <Link
                href="/deals?type=accommodation"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-night transition-colors hover:bg-gray-50"
              >
                Review stay deals
              </Link>
              <Link
                href={buddyChatHref("Help me compare Bahamas stays")}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-night transition-colors hover:bg-gray-50"
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
  );
}
