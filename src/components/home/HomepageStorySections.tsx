import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BuddyAvatar } from "@/components/ui";
import FeaturedExperiencesCarousel from "@/components/home/FeaturedExperiencesCarousel";
import TravelerModeTabs from "@/components/home/TravelerModeTabs";
import { BahaImages } from "@/lib/baha-images";

const HANDOFF_POINTS = [
  {
    title: "Tell Buddy what you have in mind",
    body: "Share dates, travelers, budget, island ideas, or the kind of Bahamas trip you want.",
    image: "/assets/home/mobile-step-tell-buddy.png",
    imageAlt: "Baha Buddy mobile prompt screen",
  },
  {
    title: "Get a plan shaped around The Bahamas",
    body: "Buddy connects islands, stays, flights, transfers, meals, boat days, and backup timing.",
    image: "/assets/home/mobile-step-home-plan.png",
    imageAlt: "Baha Buddy mobile home plan screen",
  },
  {
    title: "Move from ideas to a real itinerary",
    body: "Compare real options, save favorites, book when ready, and keep the plan with you while you travel.",
    image: "/assets/home/mobile-step-itinerary.png",
    imageAlt: "Baha Buddy mobile itinerary screen",
  },
];

const TRIP_CATEGORIES = [
  {
    title: "Stays",
    body: "Hotels, resorts, villas.",
    href: "/stays?sort=stars",
    image: BahaImages.categoryStays,
    cta: "Explore stays",
  },
  {
    title: "Flights",
    body: "Live Bahamas fares.",
    href: "/flights",
    image: BahaImages.categoryFlights,
    cta: "Search flights",
  },
  {
    title: "Things To Do",
    body: "Tours, beaches, culture.",
    href: "/explore",
    image: BahaImages.categoryThingsToDo,
    cta: "Find activities",
  },
  {
    title: "Transportation",
    body: "Transfers, ferries, rentals.",
    href: "/concierge-trip-plan",
    image: BahaImages.categoryTransport,
    cta: "Plan transport",
  },
  {
    title: "Restaurants",
    body: "Seafood, local food, dining.",
    href: "/restaurants",
    image: BahaImages.categoryRestaurants,
    cta: "Find restaurants",
  },
  {
    title: "Boat Charters",
    body: "Private cays and sandbars.",
    href: "/explore?category=boat-charters",
    image: BahaImages.categoryBoatCharters,
    cta: "Book boat days",
  },
  {
    title: "Island Guides",
    body: "Where each island fits.",
    href: "/destinations",
    image: BahaImages.categoryIslandGuides,
    cta: "Read island guides",
  },
  {
    title: "Events",
    body: "Junkanoo and culture.",
    href: "/guides",
    image: BahaImages.categoryEvents,
    cta: "See events",
  },
  {
    title: "Family Activities",
    body: "Easy days with kids.",
    href: "/explore?category=family",
    image: BahaImages.categoryFamily,
    cta: "Find family days",
  },
  {
    title: "Luxury Experiences",
    body: "Private, polished days.",
    href: "/concierge-trip-plan",
    image: BahaImages.categoryLuxury,
    cta: "Plan luxury",
  },
];

const ESSENTIAL_CATEGORY_TITLES = [
  "Stays",
  "Flights",
  "Transportation",
  "Restaurants",
];
const EXPERIENCE_CATEGORY_TITLES = [
  "Things To Do",
  "Boat Charters",
  "Island Guides",
  "Events",
  "Family Activities",
  "Luxury Experiences",
];

const TRIP_CATEGORY_GROUPS = [
  {
    label: "Plan the essentials",
    description:
      "Start with where you stay, how you arrive, how you move, and where you eat.",
    gridClassName: "lg:grid-cols-4",
    categories: TRIP_CATEGORIES.filter((category) =>
      ESSENTIAL_CATEGORY_TITLES.includes(category.title),
    ),
  },
  {
    label: "Choose the experience",
    description:
      "Then shape the days around boat time, island fit, culture, family, or luxury.",
    gridClassName: "lg:grid-cols-3",
    categories: TRIP_CATEGORIES.filter((category) =>
      EXPERIENCE_CATEGORY_TITLES.includes(category.title),
    ),
  },
];

const DECISION_LOG = [
  {
    label: "Chat",
    title: "Tell Buddy the trip",
    body: "Dates, travelers, budget, island ideas, and what kind of Bahamas days you want.",
  },
  {
    label: "Organize",
    title: "Organize every piece together",
    body: "Stays, flights, transport, food, activities, and notes stay connected in one plan.",
  },
  {
    label: "Travel",
    title: "Use the plan while you move",
    body: "Save options, compare the next step, and keep the itinerary ready for the trip.",
  },
];

const DECISION_CHAT_MESSAGES = [
  {
    from: "Traveler",
    message: "We want Nassau, a quiet beach day, and one special dinner.",
    tone: "user",
  },
  {
    from: "Buddy",
    message:
      "Got it. I’ll connect stays, flights, transfers, food, and the day-by-day plan.",
    tone: "buddy",
  },
  {
    from: "Buddy",
    message: "Drafting the trip home now...",
    tone: "thinking",
  },
] as const;

const DECISION_STATUS_CARDS = [
  {
    label: "Stay",
    value: "Shortlist saved",
    detail: "3 resorts",
  },
  {
    label: "Flight",
    value: "Arrival matched",
    detail: "2:15 PM",
  },
  {
    label: "Dinner",
    value: "Local picks ready",
    detail: "4 tables",
  },
] as const;

const DECISION_OVERLAY_WIDGETS = [
  {
    label: "Live stay",
    value: "Oceanfront resort",
    meta: "Saved to trip",
    placement: "left-[38%] top-[47%]",
  },
  {
    label: "Route",
    value: "Airport → Cable Beach",
    meta: "22 min transfer",
    placement: "right-7 bottom-24",
  },
  {
    label: "Day plan",
    value: "Beach, food, sunset",
    meta: "6 stops grouped",
    placement: "left-7 bottom-8",
  },
] as const;

const ISLAND_FIT = [
  {
    name: "Exuma",
    href: "/explore/island/the-exumas",
    image: BahaImages.exumas,
    use: "Boat days, sandbars, blue water",
    top: "Swimming pigs, cays, snorkeling",
    style: "Adventure and beach escape",
    latitude: 23.62,
    longitude: -75.97,
    mapNote:
      "Exuma sits southeast of Nassau and works best when the trip is built around cays, boat days, and clear-water time.",
  },
  {
    name: "Nassau",
    href: "/explore/island/nassau-paradise-island",
    image: BahaImages.nassau,
    use: "Easy arrivals, dining, resorts",
    top: "Food, culture, beaches",
    style: "Convenient and social",
    latitude: 25.04,
    longitude: -77.35,
    mapNote:
      "Nassau is the easiest gateway for first-time visitors, with fast airport access, dining, resorts, and day trips.",
  },
  {
    name: "Eleuthera",
    href: "/explore/island/eleuthera-harbour-island",
    image: BahaImages.eleuthera,
    use: "Quiet roads, pink sand, coves",
    top: "Pink sand, coves, day drives",
    style: "Quiet and romantic",
    latitude: 25.18,
    longitude: -76.22,
    mapNote:
      "Eleuthera runs long and narrow east of Nassau, so the trip becomes about scenic drives, quiet beaches, and slower days.",
  },
  {
    name: "The Abacos",
    href: "/explore/island/abacos",
    image: BahaImages.abacos,
    use: "Cays, marinas, sailing routes",
    top: "Marinas, cays, island hopping",
    style: "Boating and sailing",
    latitude: 26.54,
    longitude: -77.06,
    mapNote:
      "The Abacos sit in the northern chain, where marinas, cays, and sailing routes shape the itinerary.",
  },
  {
    name: "Bimini",
    href: "/explore/island/bimini",
    image: BahaImages.bimini,
    use: "Short hops, fishing, beach clubs",
    top: "Fishing, diving, quick trips",
    style: "Fast getaway",
    latitude: 25.73,
    longitude: -79.25,
    mapNote:
      "Bimini is closest to Florida, so it feels like a quick blue-water escape with fishing, diving, and beach clubs.",
  },
  {
    name: "Andros",
    href: "/explore/island/andros",
    image: BahaImages.andros,
    use: "Blue holes, bonefishing, nature",
    top: "Blue holes, reefs, fishing",
    style: "Wild and outdoors",
    latitude: 24.71,
    longitude: -77.77,
    mapNote:
      "Andros is large and wild, better for nature-first travelers who care about blue holes, reefs, and fishing.",
  },
  {
    name: "Grand Bahama",
    href: "/explore/island/grand-bahama",
    image: BahaImages.grandBahama,
    use: "Freeport, caves, beaches, diving",
    top: "Caves, beaches, reef days",
    style: "Easy adventure",
    latitude: 26.54,
    longitude: -78.7,
    mapNote:
      "Grand Bahama anchors the northern route with Freeport access, beaches, caves, diving, and easier logistics.",
  },
  {
    name: "Long Island",
    href: "/explore/island/long-island",
    image: BahaImages.longIsland,
    use: "Cliffs, beaches, quiet roads",
    top: "Dean's Blue Hole, cliffs, beaches",
    style: "Remote and scenic",
    latitude: 23.18,
    longitude: -75.09,
    mapNote:
      "Long Island stretches farther south, so the payoff is scenic cliffs, quiet roads, and a more remote trip rhythm.",
  },
  {
    name: "Harbour Island",
    href: "/explore/island/eleuthera-harbour-island",
    image: BahaImages.harbourIsland,
    use: "Pink sand, boutique stays, dining",
    top: "Pink sand, golf carts, dining",
    style: "Polished island weekend",
    latitude: 25.5,
    longitude: -76.63,
    mapNote:
      "Harbour Island sits off Eleuthera and feels boutique: pink sand, golf carts, dining, and polished short stays.",
  },
  {
    name: "Paradise Island",
    href: "/explore/island/nassau-paradise-island",
    image: BahaImages.paradiseIsland,
    use: "Resorts, beaches, family days",
    top: "Resorts, Atlantis, beaches",
    style: "Resort-first travel",
    latitude: 25.08,
    longitude: -77.32,
    mapNote:
      "Paradise Island is attached to the Nassau gateway, so it works for resort-first trips with easy beach and family time.",
  },
];

const FEATURED_EXPERIENCES = [
  {
    title: "Swimming Pigs Experience",
    island: "Exuma",
    category: "Boat tour",
    href: "/guides/swimming-pigs-exuma-guide",
    image: BahaImages.swimmingPigs,
  },
  {
    title: "Nassau Snorkeling Tour",
    island: "Nassau",
    category: "Things to do",
    href: "/explore?query=snorkeling",
    image: BahaImages.snorkeling,
  },
  {
    title: "Exuma Cays Day Trip",
    island: "Exuma",
    category: "Boat charter",
    href: "/explore/island/the-exumas",
    image: BahaImages.exumas,
  },
  {
    title: "Harbour Island Beach Escape",
    island: "Harbour Island",
    category: "Beach day",
    href: "/explore/island/eleuthera-harbour-island",
    image: BahaImages.harbourIsland,
  },
  {
    title: "Airport Transfer",
    island: "Nassau",
    category: "Transportation",
    href: "/concierge-trip-plan",
    image: BahaImages.nassau,
  },
  {
    title: "Local Food Tour",
    island: "Nassau",
    category: "Restaurants",
    href: "/restaurants",
    image: BahaImages.bahamasLifestyle,
  },
  {
    title: "Private Boat Charter",
    island: "Abacos",
    category: "Boat charter",
    href: "/explore/island/abacos",
    image: BahaImages.sunsetSailing,
  },
  {
    title: "Family Beach Day",
    island: "Paradise Island",
    category: "Family",
    href: "/explore?category=family",
    image: BahaImages.beach,
  },
];

const ECOSYSTEM_WHEEL_ITEMS = [
  {
    title: "Stays",
    label: "Hotels and villas",
    href: "/stays?sort=stars",
    image: BahaImages.staysPool,
    placement: "left-[50%] top-0 -translate-x-1/2",
  },
  {
    title: "Flights",
    label: "Island access",
    href: "/flights",
    image: BahaImages.flightAerial,
    placement: "right-0 top-[28%]",
  },
  {
    title: "Activities",
    label: "Tours and beach days",
    href: "/explore",
    image: BahaImages.waterAdventure,
    placement: "bottom-0 right-[12%]",
  },
  {
    title: "Guides",
    label: "Local island context",
    href: "/guides",
    image: BahaImages.coastalRoad,
    placement: "bottom-0 left-[12%]",
  },
  {
    title: "Transport",
    label: "Transfers and boats",
    href: "/concierge-trip-plan",
    image: BahaImages.islandHopping,
    placement: "left-0 top-[28%]",
  },
] as const;

const TRUST_LOGOS = [
  {
    name: "Nassau Paradise Island",
    src: "/assets/trust/nassau-paradise-island.svg",
    width: 269,
    height: 176,
  },
  {
    name: "The Family Islands Bahamas",
    src: "/assets/trust/family-islands-bahamas.jpg",
    width: 3600,
    height: 2047,
  },
  {
    name: "The Out Islands Bahamas",
    src: "/assets/trust/out-islands-bahamas.png",
    width: 3600,
    height: 2246,
  },
  {
    name: "Grand Bahama Island",
    src: "/assets/trust/grand-bahama-island.webp",
    width: 1760,
    height: 720,
  },
];

function homepageTripHref(seed: string, returnTo = "/"): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  params.set("source", "homepage");
  params.set("seed", seed.replace(/\s+/g, " ").trim().slice(0, 600));
  return `/dashboard/trips/new?${params.toString()}`;
}

function PrimaryLink({
  href,
  children,
  variant = "blue",
}: {
  href: string;
  children: ReactNode;
  variant?: "blue" | "white" | "outline";
}) {
  const className =
    variant === "white"
      ? "bg-white text-brand-700 hover:bg-brand-50"
      : variant === "outline"
        ? "border border-brand-200 bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50"
        : "bg-brand-600 text-white hover:bg-brand-700";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 w-fit items-center justify-center rounded-full px-5 py-3 text-sm font-bold shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      {children}
    </Link>
  );
}

function SectionIntro({
  label,
  title,
  body,
  align = "left",
  titleId,
}: {
  label: string;
  title: string;
  body: string;
  align?: "left" | "center";
  titleId?: string;
}) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"
      }
    >
      <p className="text-xs font-black uppercase text-brand-700">
        {label}
      </p>
      <h2
        id={titleId}
        className="mt-3 text-3xl font-bold leading-tight text-night "
      >
        {title}
      </h2>
      <p className="mt-4 text-base font-medium leading-7 text-charcoal sm:leading-8">
        {body}
      </p>
    </div>
  );
}

function HandoffStrip() {
  return (
    <section
      className="relative z-20 -mt-24 border-b border-gray-100 bg-transparent pb-12 sm:-mt-28"
      aria-label="How Baha Buddy plans"
    >
      <div className="mx-auto max-w-6xl px-4 pt-20 sm:pt-24">
        <ol className="grid gap-5 md:grid-cols-3">
          {HANDOFF_POINTS.map((point, index) => (
            <li
              key={point.title}
              className="relative rounded-baha-lg border border-brand-100 bg-white/95 px-5 pb-6 pt-[7.25rem] shadow-card backdrop-blur-sm sm:pt-32 lg:pt-36"
            >
              <div className="absolute left-1/2 top-0 flex h-[10.25rem] w-[9.25rem] -translate-x-1/2 -translate-y-[46%] justify-center overflow-hidden sm:h-[11.5rem] sm:w-[10.25rem] md:h-[10.75rem] md:w-[9.25rem] lg:h-[12.25rem] lg:w-[10.75rem]">
                <div className="relative h-72 w-[8.4rem] overflow-hidden rounded-[1.75rem] bg-night p-1.5 shadow-card ring-1 ring-brand-100 sm:h-80 sm:w-[9.3rem] md:h-72 md:w-[8.35rem] lg:h-[21rem] lg:w-[9.75rem]">
                  <div className="relative h-full w-full overflow-hidden rounded-[1.35rem] bg-offwhite">
                    <Image
                      src={point.image}
                      alt={point.imageAlt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 150px, 156px"
                      unoptimized
                    />
                  </div>
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-white/0 via-white/25 to-white/80 sm:h-7"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-brand-700">
                  Step {index + 1}
                </p>
                <h2 className="mt-2 text-lg font-bold leading-snug text-night">
                  {point.title}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-charcoal">
                  {point.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TrustLine() {
  return (
    <section
      className="border-b border-brand-100 bg-brand-50/60"
      aria-label="Baha Buddy trust signal"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-xl text-sm font-bold leading-6 text-brand-900 lg:max-w-md">
          Designed for Bahamas travelers, powered by local discovery, trusted
          partner listings, and AI-assisted planning.
        </p>
        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[44rem]"
          aria-label="Trusted Bahamas destination partners"
        >
          {TRUST_LOGOS.map((logo) => (
            <li
              key={logo.name}
              className="flex h-24 items-center justify-center rounded-baha-md border border-brand-100 bg-white px-4 shadow-soft"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className="max-h-16 w-auto max-w-full object-contain sm:max-h-[4.5rem]"
                sizes="(max-width: 640px) 45vw, 160px"
                unoptimized
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CategorySection() {
  return (
    <section
      className="bg-white py-16 sm:py-20"
      aria-labelledby="trip-categories-title"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p
              id="trip-categories-title"
              className="text-xs font-black uppercase text-brand-700"
            >
              Explore your Bahamas trip
            </p>
            <p className="mt-4 text-base font-medium leading-7 text-charcoal sm:leading-8">
              Start with the hotels, flights, tours, transport, and local
              experiences you need, then let Buddy help connect the pieces.
            </p>
          </div>
          <PrimaryLink href="/explore" variant="outline">
            Explore Experiences
          </PrimaryLink>
        </div>

        <div className="space-y-12">
          {TRIP_CATEGORY_GROUPS.map((group) => (
            <div
              key={group.label}
              className="grid gap-5 border-t border-brand-100 pt-6 lg:grid-cols-[13rem_1fr]"
            >
              <div>
                <h3 className="text-sm font-black uppercase text-brand-700">
                  {group.label}
                </h3>
                <p className="mt-3 text-sm font-medium leading-6 text-charcoal">
                  {group.description}
                </p>
              </div>

              <div
                className={`grid grid-cols-2 gap-3 sm:gap-4 ${group.gridClassName}`}
              >
                {group.categories.map((category) => (
                  <Link
                    key={category.title}
                    href={category.href}
                    className="group relative min-h-[18rem] overflow-hidden rounded-baha-lg bg-night text-night shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <Image
                      src={category.image}
                      alt={`${category.title} in The Bahamas`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 260px"
                      unoptimized
                    />
                    <div className="relative flex min-h-[18rem] flex-col justify-end p-4">
                      <div>
                        <h3 className="text-2xl font-bold leading-tight text-white [text-shadow:0_3px_28px_rgba(0,0,0,0.42)]">
                          {category.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white [text-shadow:0_3px_24px_rgba(0,0,0,0.38)]">
                          {category.body}
                        </p>
                        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700 shadow-soft transition-colors group-hover:border-brand-300 group-hover:bg-brand-50">
                          {category.cta}
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.4}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DecisionSection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            label="Chat with Buddy"
            title="Plan and organize your whole Bahamas trip."
            body="Tell Buddy what you have in mind, then keep the stays, flights, transfers, food, activities, and notes in one organized trip."
          />
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-none">
            <PrimaryLink
              href={homepageTripHref(
                "Help me organize a Bahamas trip with stays, flights, transfers, food, and activities.",
              )}
            >
              Chat With Buddy
            </PrimaryLink>
            <PrimaryLink href="/explore" variant="outline">
              Explore Experiences
            </PrimaryLink>
          </div>
        </div>

        <div className="relative min-h-[34rem] overflow-hidden rounded-baha-xl border border-brand-100 bg-night shadow-card sm:min-h-[38rem] lg:min-h-[42rem]">
          <Image
            src="/assets/home/buddy-chat-waterfront-planner.png"
            alt="Traveler using Baha Buddy chat on a Bahamas beach"
            fill
            className="object-cover object-center"
            sizes="(max-width: 1280px) calc(100vw - 2rem), 1152px"
            priority={false}
            unoptimized
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-night/76 via-night/18 to-night/0"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-night/85 via-night/32 to-transparent"
            aria-hidden="true"
          />

          <div className="relative z-10 flex min-h-[36rem] flex-col gap-10 p-4 sm:p-5">
            <div className="flex max-w-md items-center gap-3 rounded-baha-lg border border-white/25 bg-white/92 px-4 py-3 shadow-soft backdrop-blur-md">
              <BuddyAvatar size="sm" state="thinking" />
              <div>
                <p className="text-xs font-black uppercase text-brand-700">
                  Buddy organizes
                </p>
                <p className="text-sm font-bold text-night">
                  One conversation becomes one trip plan
                </p>
              </div>
            </div>

            <div
              className="grid max-w-[24rem] gap-3"
              aria-label="Animated Buddy chat preview"
            >
              {DECISION_CHAT_MESSAGES.map((item, index) => (
                <div
                  key={item.message}
                  className={`animate-slide-up motion-reduce:animate-none ${
                    item.tone === "user"
                      ? "ml-auto rounded-baha-lg rounded-tr-sm bg-brand-600 text-white"
                      : "mr-auto rounded-baha-lg rounded-tl-sm border border-white/35 bg-white/95 text-night shadow-soft backdrop-blur-md"
                  } max-w-[20rem] px-4 py-3`}
                  style={{ animationDelay: `${index * 140}ms` }}
                >
                  <p
                    className={`text-xs font-black uppercase ${item.tone === "user" ? "text-brand-100" : "text-brand-700"}`}
                  >
                    {item.from}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-5">
                    {item.message}
                  </p>
                  {item.tone === "thinking" && (
                    <span className="mt-2 flex gap-1" aria-hidden="true">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-buddy-think motion-reduce:animate-none"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-buddy-think motion-reduce:animate-none"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-buddy-think motion-reduce:animate-none"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className="pointer-events-none absolute right-4 top-28 hidden w-48 space-y-2 sm:block"
            aria-hidden="true"
          >
            {DECISION_STATUS_CARDS.map((item, index) => (
              <div
                key={item.label}
                className="animate-slide-up rounded-baha-md border border-white/35 bg-white/92 px-3 py-2 shadow-soft backdrop-blur-md motion-reduce:animate-none"
                style={{ animationDelay: `${420 + index * 140}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase text-brand-700">
                      {item.label}
                    </p>
                    <p className="text-xs font-bold text-night">{item.value}</p>
                  </div>
                  <span className="mt-1 h-2 w-2 rounded-full bg-palm-500 animate-buddy-pulse motion-reduce:animate-none" />
                </div>
                <p className="mt-1 text-xs font-bold text-charcoal">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <div
            className="pointer-events-none absolute inset-0 hidden sm:block"
            aria-hidden="true"
          >
            {DECISION_OVERLAY_WIDGETS.map((item, index) => (
              <div
                key={item.label}
                className={`absolute ${item.placement} max-w-[13rem] animate-breathe rounded-baha-md border border-white/35 bg-white/90 px-3 py-2 shadow-card backdrop-blur-md motion-reduce:animate-none`}
                style={{ animationDelay: `${index * 180}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" />
                  </span>
                  <p className="text-xs font-black uppercase text-brand-700">
                    {item.label}
                  </p>
                </div>
                <p className="mt-1 text-xs font-black leading-4 text-night">
                  {item.value}
                </p>
                <p className="text-xs font-bold text-charcoal">
                  {item.meta}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-7 grid gap-5 md:grid-cols-3"
          aria-label="Buddy planning steps"
        >
          {DECISION_LOG.map((item) => (
            <article
              key={item.label}
              className="border-t border-brand-100 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0 md:first:border-l-0 md:first:pl-0"
            >
              <p className="text-xs font-black uppercase text-brand-700">
                {item.label}
              </p>
              <h3 className="mt-2 text-base font-bold leading-tight text-night">
                {item.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-charcoal">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function IslandFitSection() {
  return (
    <section
      className="bg-white py-16 sm:py-20"
      aria-labelledby="island-fit-title"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <SectionIntro
            titleId="island-fit-title"
            label="Start with the island"
            title="The Bahamas changes every few miles."
            body="A good Bahamas plan starts by choosing the island that matches the trip, then building everything else around that choice."
          />
          <PrimaryLink href="/destinations" variant="outline">
            Compare islands
          </PrimaryLink>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-3">
          <div className="grid auto-cols-[78vw] grid-flow-col gap-4 sm:auto-cols-[18rem] lg:auto-cols-[16rem]">
            {ISLAND_FIT.map((island) => (
              <Link
                key={island.name}
                href={island.href}
                className="group relative min-h-[23rem] overflow-hidden rounded-baha-lg bg-night text-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <Image
                  src={island.image}
                  alt={`${island.name}, Bahamas`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 78vw, 288px"
                  unoptimized
                />
                <div className="relative flex min-h-[23rem] flex-col justify-end p-5">
                  <h3 className="text-3xl font-bold leading-none text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]">
                    {island.name}
                  </h3>
                  <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-soft transition-colors group-hover:bg-brand-50">
                    Explore island
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedExperiencesSection() {
  return (
    <section
      className="bg-white py-16 sm:py-20"
      aria-labelledby="featured-experiences-title"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase text-brand-700">
              Featured Bahamas experiences
            </p>
            <h2
              id="featured-experiences-title"
              className="mt-3 text-2xl font-bold leading-tight text-night "
            >
              Popular ways to spend a Bahamas day.
            </h2>
            <p className="mt-3 text-base font-medium leading-7 text-charcoal">
              Browse boat days, beach escapes, food tours, transfers, and family
              picks before Buddy fits them into the trip.
            </p>
          </div>
          <PrimaryLink href="/explore" variant="outline">
            Explore Experiences
          </PrimaryLink>
        </div>

        <FeaturedExperiencesCarousel experiences={FEATURED_EXPERIENCES} />
      </div>
    </section>
  );
}

function PartnerEcosystemSection() {
  return (
    <section
      className="border-t border-gray-100 bg-offwhite py-16 sm:py-20"
      aria-labelledby="partner-ecosystem-title"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 rounded-baha-xl border border-brand-100 bg-white p-6 shadow-soft sm:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase text-brand-700">
              Bahamas travel ecosystem
            </p>
            <h2
              id="partner-ecosystem-title"
              className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-night "
            >
              Built to help travelers discover more of The Bahamas.
            </h2>
            <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-charcoal sm:leading-8">
              Bring stays, flights, tours, restaurants, transfers, and local
              partners into one Bahamas trip flow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/partners">Partner With Us</PrimaryLink>
              <PrimaryLink href="/contact" variant="outline">
                Contact Baha Buddy
              </PrimaryLink>
            </div>
          </div>

          <EcosystemWheel />
        </div>
      </div>
    </section>
  );
}

function EcosystemWheel() {
  return (
    <div
      className="relative mx-auto w-full max-w-[36rem]"
      role="group"
      aria-label="Baha Buddy connects the Bahamas travel ecosystem"
    >
      <div className="grid gap-3 sm:hidden">
        <div className="flex items-center gap-3 rounded-baha-lg border border-brand-100 bg-brand-50 p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-baha-md bg-white shadow-soft">
            <Image
              src="/brand/baha-logo-mark.svg"
              alt=""
              width={42}
              height={42}
            />
          </span>
          <div>
            <p className="text-sm font-black text-night">Baha Buddy</p>
            <p className="text-xs font-bold uppercase text-brand-700">
              Trip center
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ECOSYSTEM_WHEEL_ITEMS.map((item) => (
            <EcosystemWheelCard key={item.title} item={item} compact />
          ))}
        </div>
      </div>

      <div className="relative hidden aspect-square min-h-[31rem] sm:block">
        <div
          className="absolute inset-12 rounded-full border border-brand-100"
          aria-hidden="true"
        />
        <div
          className="absolute inset-24 rounded-full border border-dashed border-gold-300/80"
          aria-hidden="true"
        />

        <div className="absolute left-1/2 top-1/2 z-20 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-brand-100 bg-white text-center shadow-soft">
          <Image
            src="/brand/baha-logo-mark.svg"
            alt="Baha Buddy"
            width={54}
            height={54}
            className="mb-2"
          />
          <span className="text-sm font-black leading-tight text-night">
            Baha Buddy
          </span>
          <span className="text-xs font-bold uppercase text-brand-700">
            Trip center
          </span>
        </div>

        {ECOSYSTEM_WHEEL_ITEMS.map((item) => (
          <EcosystemWheelCard key={item.title} item={item} />
        ))}
      </div>
    </div>
  );
}

function EcosystemWheelCard({
  item,
  compact = false,
}: {
  item: (typeof ECOSYSTEM_WHEEL_ITEMS)[number];
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link
        href={item.href}
        className="group relative min-h-36 overflow-hidden rounded-baha-lg border border-brand-100 bg-night shadow-soft"
      >
        <Image
          src={item.image}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="50vw"
          unoptimized
        />
        <span
          className="absolute inset-0 bg-gradient-to-t from-night/72 via-night/14 to-transparent"
          aria-hidden="true"
        />
        <span className="relative flex h-full min-h-36 flex-col justify-end p-3">
          <span className="text-lg font-black leading-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
            {item.title}
          </span>
          <span className="mt-1 text-xs font-bold leading-4 text-white/90 [text-shadow:0_2px_14px_rgba(0,0,0,0.4)]">
            {item.label}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`group absolute z-10 h-36 w-40 overflow-hidden rounded-baha-lg border border-white bg-night shadow-soft transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${item.placement}`}
    >
      <Image
        src={item.image}
        alt=""
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="160px"
        unoptimized
      />
      <span
        className="absolute inset-0 bg-gradient-to-t from-night/78 via-night/18 to-transparent"
        aria-hidden="true"
      />
      <span className="relative flex h-full flex-col justify-end p-3.5">
        <span className="text-xl font-black leading-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
          {item.title}
        </span>
        <span className="mt-1 text-xs font-bold leading-4 text-white/90 [text-shadow:0_2px_14px_rgba(0,0,0,0.4)]">
          {item.label}
        </span>
      </span>
    </Link>
  );
}

export default function HomepageStorySections() {
  return (
    <>
      <HandoffStrip />
      <TrustLine />
      <IslandFitSection />
      <TravelerModeTabs />
      <CategorySection />
      <DecisionSection />
      <FeaturedExperiencesSection />
      <PartnerEcosystemSection />
    </>
  );
}
