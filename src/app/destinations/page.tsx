import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { DestinationFallbackImages } from "@/lib/baha-images";
import { buddyChatHref } from "@/lib/buddy-chat";

export const metadata: Metadata = {
  title: "Bahamas Island Finder | Baha Buddy",
  description:
    "Compare Bahamas islands by trip style, access, pace, and planning complexity so Buddy can help you choose the right island.",
  openGraph: {
    title: "Find the Right Bahamas Island | Baha Buddy",
    description:
      "Compare Bahamas islands by trip style, access, pace, and planning complexity.",
  },
};

export const revalidate = 3600;

type DestinationSearchParams = {
  style?: string;
  island?: string;
};

type TripStyle = {
  id: string;
  label: string;
  summary: string;
};

type IslandFit = {
  slug: string;
  name: string;
  region: string;
  imageSrc: string;
  summary: string;
  bestFor: string[];
  styles: string[];
  access: string;
  tripLength: string;
  pace: string;
  complexity: "Easy" | "Moderate" | "High-touch";
  signature: string[];
  notFor: string;
  airportCode?: string;
  guideSlug?: string;
};

const TRIP_STYLES: TripStyle[] = [
  {
    id: "all",
    label: "All trips",
    summary: "Compare every island by fit, pace, and logistics.",
  },
  {
    id: "first-time",
    label: "First trip",
    summary: "Easy access, strong stays, and simple planning.",
  },
  {
    id: "family",
    label: "Family",
    summary: "Kid-friendly stays, simpler transfers, and flexible days.",
  },
  {
    id: "romance",
    label: "Romance",
    summary: "Boutique stays, quiet beaches, and polished dinners.",
  },
  {
    id: "luxury",
    label: "Luxury",
    summary: "High-end stays, charters, and private-feeling days.",
  },
  {
    id: "adventure",
    label: "Adventure",
    summary: "Boats, blue holes, diving, fishing, and nature.",
  },
  {
    id: "quiet",
    label: "Quiet",
    summary: "Slower pace, fewer crowds, and remote beaches.",
  },
  {
    id: "culture",
    label: "Culture",
    summary: "Food, music, history, local craft, and town energy.",
  },
  {
    id: "boating",
    label: "Boating",
    summary: "Cays, marinas, charters, and island hopping.",
  },
  {
    id: "diving",
    label: "Diving",
    summary: "Reefs, blue holes, wrecks, walls, and shark dives.",
  },
];

const HERO_IMAGE = DestinationFallbackImages.islandFinderHero;

const DECISION_STEPS = [
  {
    step: "1",
    title: "Choose the island",
    body: "Match pace, access, trip length, and budget before adding hotels or activities.",
  },
  {
    step: "2",
    title: "Check the logistics",
    body: "Confirm the arrival airport, transfer style, and whether the island supports the trip you want.",
  },
  {
    step: "3",
    title: "Build the plan",
    body: "Buddy connects stays, flights, food, boat days, and transfers once the island is right.",
  },
] as const;

const ISLAND_FITS: IslandFit[] = [
  {
    slug: "nassau-paradise-island",
    name: "Nassau & Paradise Island",
    region: "New Providence",
    imageSrc: DestinationFallbackImages.nassauParadiseIsland,
    summary:
      "The easiest first Bahamas base: direct flights, resorts, food, nightlife, beaches, and history in one compact area.",
    bestFor: ["First-timers", "Families", "Food & nightlife"],
    styles: ["first-time", "family", "culture", "luxury"],
    access: "Direct flights into NAS; short taxis and resort transfers.",
    tripLength: "3-5 days",
    pace: "Lively",
    complexity: "Easy",
    signature: [
      "Atlantis and Cabbage Beach",
      "Junkanoo and forts",
      "Arawak Cay food",
    ],
    notFor: "Travelers who want a silent, remote-island pace.",
    airportCode: "NAS",
    guideSlug: "nassau-paradise-island",
  },
  {
    slug: "the-exumas",
    name: "The Exumas",
    region: "Great Exuma and the cays",
    imageSrc: DestinationFallbackImages.exumas,
    summary:
      "Turquoise water, sandbars, pigs, boat days, and luxury-casual island hopping across a chain of cays.",
    bestFor: ["Couples", "Boating", "Bucket-list water"],
    styles: ["romance", "luxury", "adventure", "quiet", "boating"],
    access: "Fly into EXU, then use taxis, boat tours, and private charters.",
    tripLength: "4-7 days",
    pace: "Water-led",
    complexity: "Moderate",
    signature: ["Exuma Cays", "Swimming pigs", "Sandbars and snorkeling"],
    notFor: "Travelers who want dense nightlife or everything walkable.",
    airportCode: "EXU",
    guideSlug: "the-exumas",
  },
  {
    slug: "eleuthera-harbour-island",
    name: "Eleuthera",
    region: "Eleuthera",
    imageSrc: DestinationFallbackImages.eleuthera,
    summary:
      "A long, relaxed island for beach drives, surf breaks, pink sand, and a slower independent-traveler rhythm.",
    bestFor: ["Road trips", "Quiet beaches", "Couples"],
    styles: ["romance", "adventure", "quiet", "culture"],
    access:
      "Fly into North Eleuthera or Governor's Harbour; rent a car for range.",
    tripLength: "4-6 days",
    pace: "Laid-back",
    complexity: "Moderate",
    signature: [
      "Glass Window Bridge",
      "Pink sand beaches",
      "Local settlements",
    ],
    notFor: "Travelers who dislike driving between beaches and restaurants.",
    airportCode: "ELH",
    guideSlug: "eleuthera-harbour-island",
  },
  {
    slug: "harbour-island",
    name: "Harbour Island",
    region: "Off North Eleuthera",
    imageSrc: DestinationFallbackImages.harbourIsland,
    summary:
      "Boutique hotels, golf carts, polished restaurants, and one of the most romantic pink-sand beach settings.",
    bestFor: ["Honeymoons", "Boutique luxury", "Short romantic trips"],
    styles: ["romance", "luxury", "quiet", "culture"],
    access: "Fly into ELH, then take a quick taxi and water taxi to Briland.",
    tripLength: "3-5 days",
    pace: "Polished and calm",
    complexity: "Moderate",
    signature: ["Pink Sands Beach", "Dunmore Town", "Golf-cart days"],
    notFor: "Travelers looking for a budget-heavy or nightlife-first trip.",
    airportCode: "ELH",
    guideSlug: "harbour-island",
  },
  {
    slug: "abacos",
    name: "The Abacos",
    region: "Abaco cays",
    imageSrc: DestinationFallbackImages.abacos,
    summary:
      "Sailing, marinas, pastel settlements, reef-protected water, and easy cay-to-cay boating days.",
    bestFor: ["Sailors", "Boaters", "Families who want cays"],
    styles: ["family", "adventure", "quiet", "boating"],
    access: "Fly into MHH, then use ferries, carts, rentals, or boats by cay.",
    tripLength: "5-7 days",
    pace: "Harbor-hopping",
    complexity: "Moderate",
    signature: ["Hope Town lighthouse", "Marinas", "Island hopping"],
    notFor: "Travelers who want one resort and no transfer planning.",
    airportCode: "MHH",
    guideSlug: "abacos",
  },
  {
    slug: "bimini",
    name: "Bimini",
    region: "Western Bahamas",
    imageSrc: DestinationFallbackImages.bimini,
    summary:
      "The quick escape from Florida with fishing, shark dives, beach clubs, and a compact weekend footprint.",
    bestFor: ["Long weekends", "Fishing", "Florida gateways"],
    styles: ["first-time", "adventure", "boating", "diving"],
    access: "Fly into BIM or arrive by ferry/boat from South Florida.",
    tripLength: "2-4 days",
    pace: "Quick and social",
    complexity: "Easy",
    signature: ["Big-game fishing", "Sapona wreck", "Beach clubs"],
    notFor: "Travelers planning a long, remote island reset.",
    airportCode: "BIM",
    guideSlug: "bimini",
  },
  {
    slug: "andros",
    name: "Andros",
    region: "Central Bahamas",
    imageSrc: DestinationFallbackImages.andros,
    summary:
      "The wild island: bonefishing, blue holes, reefs, mangroves, craft, and serious nature with fewer crowds.",
    bestFor: ["Diving", "Bonefishing", "Nature"],
    styles: ["adventure", "quiet", "culture", "diving"],
    access:
      "Fly into ASD or nearby regional airports; plan transfers carefully.",
    tripLength: "5-7 days",
    pace: "Wild and spacious",
    complexity: "High-touch",
    signature: ["Blue holes", "Andros Barrier Reef", "Bonefish flats"],
    notFor: "Travelers who need polished resort density and easy nightlife.",
    airportCode: "ASD",
    guideSlug: "andros",
  },
  {
    slug: "grand-bahama",
    name: "Grand Bahama",
    region: "Freeport and Lucaya",
    imageSrc: DestinationFallbackImages.grandBahama,
    summary:
      "A practical base for diving, nature parks, beaches, and city convenience with direct airport access.",
    bestFor: ["Diving", "Families", "Easy logistics"],
    styles: ["first-time", "family", "adventure", "diving"],
    access: "Fly into FPO; taxis and tours cover most visitor routes.",
    tripLength: "3-5 days",
    pace: "Convenient",
    complexity: "Easy",
    signature: ["Lucayan National Park", "Diving", "Freeport and Port Lucaya"],
    notFor: "Travelers who want tiny-cay intimacy from the first minute.",
    airportCode: "FPO",
    guideSlug: "grand-bahama",
  },
  {
    slug: "long-island",
    name: "Long Island",
    region: "Southern Bahamas",
    imageSrc: DestinationFallbackImages.longIsland,
    summary:
      "Dramatic cliffs, Dean's Blue Hole, empty beaches, and a long-road island made for independent explorers.",
    bestFor: ["Quiet beaches", "Blue holes", "Scenic drives"],
    styles: ["adventure", "quiet", "diving", "romance"],
    access: "Use regional flights and a rental car; distances matter.",
    tripLength: "4-6 days",
    pace: "Remote and scenic",
    complexity: "High-touch",
    signature: ["Dean's Blue Hole", "Cape Santa Maria", "Cliffs and coves"],
    notFor: "Travelers who want dense restaurant choice every night.",
    guideSlug: "long-island",
  },
  {
    slug: "cat-island",
    name: "Cat Island",
    region: "Central Bahamas",
    imageSrc: DestinationFallbackImages.catIsland,
    summary:
      "Quiet beaches, rake-and-scrape culture, Mount Alvernia, and a deeply local out-island feel.",
    bestFor: ["Quiet", "Culture", "Low-key romance"],
    styles: ["quiet", "culture", "romance"],
    access: "Regional flights and rental cars; plan around limited schedules.",
    tripLength: "4-6 days",
    pace: "Slow and local",
    complexity: "High-touch",
    signature: ["Mount Alvernia", "Rake-and-scrape", "Empty beaches"],
    notFor: "Travelers who want resort density or late-night options.",
  },
  {
    slug: "san-salvador",
    name: "San Salvador",
    region: "Eastern Bahamas",
    imageSrc: DestinationFallbackImages.sanSalvador,
    summary:
      "Wall diving, history, clear water, and quiet beaches for travelers who want a focused island stay.",
    bestFor: ["Diving", "History", "Quiet beach days"],
    styles: ["quiet", "adventure", "diving", "culture"],
    access: "Regional flights; keep the plan simple once you arrive.",
    tripLength: "4-6 days",
    pace: "Quiet and focused",
    complexity: "High-touch",
    signature: ["Wall dives", "Columbus history", "Uncrowded beaches"],
    notFor: "Travelers who want lots of shopping or nightlife.",
  },
  {
    slug: "berry-islands",
    name: "Berry Islands",
    region: "Northwest Bahamas",
    imageSrc: DestinationFallbackImages.berryIslands,
    summary:
      "Cays, fishing, private-island energy, and boat-forward days for travelers who value space.",
    bestFor: ["Boating", "Luxury", "Fishing"],
    styles: ["luxury", "quiet", "boating", "adventure"],
    access: "Best with charter, boat, or carefully planned transfers.",
    tripLength: "4-7 days",
    pace: "Private-cay calm",
    complexity: "High-touch",
    signature: ["Cays", "Fishing", "Private beaches"],
    notFor: "Travelers who want easy public transit or dense towns.",
  },
  {
    slug: "inagua",
    name: "Inagua",
    region: "Far southern Bahamas",
    imageSrc: DestinationFallbackImages.inagua,
    summary:
      "Flamingos, national parks, birding, salt ponds, and a remote nature trip for patient planners.",
    bestFor: ["Birding", "Nature", "Remote travel"],
    styles: ["quiet", "adventure"],
    access:
      "Remote regional access; schedules and lodging need careful planning.",
    tripLength: "5-7 days",
    pace: "Remote nature",
    complexity: "High-touch",
    signature: ["Flamingo colony", "National parks", "Salt ponds"],
    notFor: "Travelers who want a casual first Bahamas trip.",
  },
];

const STYLE_BY_ID = new Map(TRIP_STYLES.map((style) => [style.id, style]));

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function paramsFrom(values: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value?.trim()) params.set(key, value.trim());
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function activeStyleFrom(rawStyle: string | undefined): TripStyle {
  return STYLE_BY_ID.get(normalizeKey(rawStyle)) ?? TRIP_STYLES[0];
}

function findIsland(rawIsland: string | undefined): IslandFit | null {
  const key = normalizeKey(rawIsland);
  if (!key) return null;
  return (
    ISLAND_FITS.find(
      (island) =>
        normalizeKey(island.name) === key ||
        normalizeKey(island.slug) === key ||
        island.name.toLowerCase().includes((rawIsland ?? "").toLowerCase()),
    ) ?? null
  );
}

function styleHref(styleId: string, activeIsland: IslandFit | null): string {
  return `/destinations${paramsFrom({
    style: styleId === "all" ? undefined : styleId,
    island: activeIsland?.name,
  })}`;
}

function clearIslandHref(activeStyle: TripStyle): string {
  return `/destinations${paramsFrom({
    style: activeStyle.id === "all" ? undefined : activeStyle.id,
  })}`;
}

function islandGuideHref(island: IslandFit): string {
  if (island.guideSlug) return `/explore/island/${island.guideSlug}`;
  return `/explore/places${paramsFrom({ island: island.name })}`;
}

function islandExploreHref(island: IslandFit): string {
  return `/explore/places${paramsFrom({ island: island.name })}`;
}

function islandFlightsHref(island: IslandFit): string | null {
  return island.airportCode
    ? `/flights${paramsFrom({ destination: island.airportCode })}`
    : null;
}

function startTripHref(island: IslandFit): string {
  const guideHref = islandGuideHref(island);
  return `/dashboard/trips/new${paramsFrom({
    returnTo: guideHref,
    source: "destination",
    destination: island.guideSlug ?? island.slug,
    seed: `Plan a Bahamas trip around ${island.name}. Include stays, flights, transfers, food, activities, and realistic timing.`,
  })}`;
}

function askBuddyHref(island?: IslandFit): string {
  return buddyChatHref(
    island
      ? `Help me decide if ${island.name} is the right Bahamas island for my trip. Compare fit, access, stays, flights, food, and activities.`
      : "Help me choose the right Bahamas island for my trip. Ask about my dates, travelers, budget, pace, and must-have experiences.",
  );
}

function complexityTone(complexity: IslandFit["complexity"]): string {
  if (complexity === "Easy") return "bg-palm-50 text-palm-700";
  if (complexity === "Moderate") return "bg-gold-50 text-gold-700";
  return "bg-brand-50 text-brand-700";
}

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: DestinationSearchParams;
}) {
  const activeStyle = activeStyleFrom(searchParams.style);
  const activeIsland = findIsland(searchParams.island);
  const filteredIslands = activeIsland
    ? [activeIsland]
    : activeStyle.id === "all"
      ? ISLAND_FITS
      : ISLAND_FITS.filter((island) => island.styles.includes(activeStyle.id));
  const comparisonIslands = filteredIslands.slice(0, 7);

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500"
          >
            <Link href="/" className="hover:text-night">
              Home
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-night">Destinations</span>
          </nav>

          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-night shadow-card sm:rounded-3xl">
            <Image
              src={HERO_IMAGE}
              alt="Traveler comparing Bahamas islands from an island overlook"
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 1152px"
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-night/88 via-night/50 to-night/78 sm:bg-gradient-to-r sm:from-night/86 sm:via-night/44 sm:to-night/18"
              aria-hidden="true"
            />

            <div className="relative z-10 flex min-h-[38rem] flex-col justify-between p-5 sm:min-h-[34rem] sm:p-8 lg:p-10">
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase text-white">
                  Island finder
                </p>
                <h1 className="text-4xl font-bold leading-tight text-white ">
                  {activeIsland
                    ? `Is ${activeIsland.name} right for your trip?`
                    : "Find the right Bahamas island for your trip."}
                </h1>
                <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/90 ">
                  Compare islands by trip style, access, pace, and planning
                  complexity. Attractions and restaurants come later; first,
                  choose the island that fits the trip.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={askBuddyHref(activeIsland ?? undefined)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition-colors hover:bg-brand-700"
                  >
                    Ask Buddy to choose
                  </Link>
                  <Link
                    href="#island-comparison"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/45 bg-white/95 px-5 py-3 text-sm font-bold text-night shadow-soft transition-colors hover:bg-white"
                  >
                    Compare islands
                  </Link>
                </div>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:max-w-4xl">
                {[
                  [
                    activeIsland ? activeIsland.region : "Island scope",
                    activeIsland
                      ? activeIsland.tripLength
                      : `${filteredIslands.length} Bahamas islands`,
                    activeIsland
                      ? activeIsland.access
                      : "No general destination sprawl.",
                  ],
                  [
                    "Decision first",
                    "Fit before places",
                    "Start with access, pace, and days before choosing every stop.",
                  ],
                  [
                    "Honest tradeoffs",
                    activeIsland ? activeIsland.complexity : "Clear matches",
                    activeIsland
                      ? activeIsland.notFor
                      : "What is great, what is inconvenient, and who each island is for.",
                  ],
                ].map(([eyebrow, title, body]) => (
                  <div
                    key={`${eyebrow}-${title}`}
                    className="rounded-2xl border border-white/25 bg-white/92 p-4 shadow-soft backdrop-blur-md"
                  >
                    <p className="text-xs font-bold uppercase text-brand-700">
                      {eyebrow}
                    </p>
                    <p className="mt-1 text-base font-bold leading-tight text-night">
                      {title}
                    </p>
                    <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-charcoal">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {DECISION_STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                    {step.step}
                  </span>
                  <h2 className="text-base font-bold text-night">
                    {step.title}
                  </h2>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-charcoal">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <section aria-labelledby="trip-style-title">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="trip-style-title"
                className="text-2xl font-bold text-night"
              >
                What kind of trip are you planning?
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-charcoal">
                Use these filters to compare islands by the way the trip should
                feel.
              </p>
            </div>
            {activeIsland && (
              <Link
                href={clearIslandHref(activeStyle)}
                className="text-sm font-bold text-brand-700 hover:text-brand-800"
              >
                Show all matching islands
              </Link>
            )}
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-2"
            aria-label="Trip style filters"
          >
            {TRIP_STYLES.map((style) => {
              const isActive = activeStyle.id === style.id;
              return (
                <Link
                  key={style.id}
                  href={styleHref(style.id, activeIsland)}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                    isActive
                      ? "border-night bg-white text-night shadow-soft"
                      : "border-gray-200 bg-white text-charcoal hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {style.label}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="island-matches-title">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">
                {filteredIslands.length} island
                {filteredIslands.length !== 1 ? "s" : ""} matched
              </p>
              <h2
                id="island-matches-title"
                className="mt-1 text-2xl font-bold text-night"
              >
                {activeIsland
                  ? activeIsland.name
                  : activeStyle.id === "all"
                    ? "Island matches to compare"
                    : `${activeStyle.label} island matches`}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-charcoal">
                {activeStyle.summary}
              </p>
            </div>
            <Link
              href="/explore"
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Browse activities in Explore
            </Link>
          </div>

          {filteredIslands.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <h3 className="text-lg font-bold text-night">
                No island match found
              </h3>
              <p className="mt-2 text-sm font-medium text-charcoal">
                Try a different style, or ask Buddy to compare the closest
                island fits.
              </p>
              <Link
                href={askBuddyHref()}
                className="mt-5 inline-flex rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
              >
                Ask Buddy to choose
              </Link>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredIslands.map((island, index) => {
                const flightsHref = islandFlightsHref(island);
                return (
                  <article
                    key={island.slug}
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
                      <div className="relative min-h-72 overflow-hidden bg-gray-100 lg:h-full">
                        <Image
                          src={island.imageSrc}
                          alt={`${island.name} trip planning scene`}
                          fill
                          priority={index < 2}
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 1024px) 100vw, 440px"
                        />
                        <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-night shadow-soft backdrop-blur-sm">
                          {island.region}
                        </div>
                      </div>

                      <div className="flex flex-col p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="max-w-2xl">
                            <h3 className="text-2xl font-bold text-night">
                              {island.name}
                            </h3>
                            <p className="mt-2 text-sm font-medium leading-6 text-charcoal">
                              {island.summary}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${complexityTone(island.complexity)}`}
                          >
                            {island.complexity}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {island.bestFor.map((fit) => (
                            <span
                              key={fit}
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-charcoal"
                            >
                              {fit}
                            </span>
                          ))}
                        </div>

                        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                          <div className="rounded-xl bg-gray-50 p-4">
                            <dt className="font-bold text-night">Access</dt>
                            <dd className="mt-2 font-medium leading-6 text-charcoal">
                              {island.access}
                            </dd>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-4">
                            <dt className="font-bold text-night">
                              Best length
                            </dt>
                            <dd className="mt-2 font-medium text-charcoal">
                              {island.tripLength}
                            </dd>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-4">
                            <dt className="font-bold text-night">Signature</dt>
                            <dd className="mt-2 font-medium leading-6 text-charcoal">
                              {island.signature.join(", ")}
                            </dd>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-4">
                            <dt className="font-bold text-night">Not if</dt>
                            <dd className="mt-2 font-medium leading-6 text-charcoal">
                              {island.notFor}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-6 grid gap-2 sm:grid-cols-2">
                          <Link
                            href={startTripHref(island)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-3 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-brand-700"
                          >
                            Start trip
                          </Link>
                          <Link
                            href={islandGuideHref(island)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                          >
                            View island guide
                          </Link>
                          <Link
                            href={islandExploreHref(island)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                          >
                            Explore places
                          </Link>
                          <Link
                            href={flightsHref ?? askBuddyHref(island)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-sm font-bold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-night"
                          >
                            {flightsHref ? "Check flights" : "Ask Buddy"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          id="island-comparison"
          className="mt-16"
          aria-labelledby="island-comparison-title"
        >
          <div className="mb-6">
            <p className="text-xs font-bold uppercase text-gray-500">
              Compare islands
            </p>
            <h2
              id="island-comparison-title"
              className="mt-1 text-2xl font-bold text-night"
            >
              At-a-glance island fit
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-charcoal">
              Use this as the decision layer before opening detailed guides or
              asking Buddy to assemble the full plan.
            </p>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                <tr>
                  <th scope="col" className="w-44 px-4 py-3">
                    Island
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Best fit
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Access
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Pace
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Planning
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisonIslands.map((island) => (
                  <tr key={island.slug} className="align-top">
                    <th
                      scope="row"
                      className="px-4 py-4 text-sm font-bold text-night"
                    >
                      {island.name}
                      <span className="mt-1 block text-xs font-semibold text-gray-500">
                        {island.tripLength}
                      </span>
                    </th>
                    <td className="px-4 py-4 font-medium leading-6 text-charcoal">
                      {island.bestFor.join(", ")}
                    </td>
                    <td className="px-4 py-4 font-medium leading-6 text-charcoal">
                      {island.access}
                    </td>
                    <td className="px-4 py-4 font-medium text-charcoal">
                      {island.pace}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${complexityTone(island.complexity)}`}
                      >
                        {island.complexity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {comparisonIslands.map((island) => (
              <article
                key={island.slug}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-night">
                    {island.name}
                  </h3>
                  <span
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${complexityTone(island.complexity)}`}
                  >
                    {island.complexity}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium leading-6 text-charcoal">
                  {island.bestFor.join(", ")}
                </p>
                <p className="mt-2 text-xs font-bold uppercase text-gray-500">
                  {island.tripLength} / {island.pace}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-brand-700">
                Still deciding?
              </p>
              <h2 className="mt-2 text-2xl font-bold text-night">
                Let Buddy narrow it down.
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-charcoal">
                Tell Buddy your dates, travelers, budget, island ideas, and
                must-haves. Buddy will recommend the island first, then build
                the stay, flight, transport, food, and activity plan around it.
              </p>
            </div>
            <Link
              href={askBuddyHref()}
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              Ask Buddy to choose
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}
