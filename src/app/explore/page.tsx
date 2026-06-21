import ExploreTabs, {
  type DiscoverArticle,
  type SocialVideo,
  type TravelerStory,
} from '@/components/explore/ExploreTabs'
import Image from 'next/image'
import Link from 'next/link'
import ChatWidget from '@/components/ChatWidget'
import Footer from '@/components/Footer'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import { BahaImages } from '@/lib/baha-images'
import { buddyChatHref } from '@/lib/buddy-chat'
import { ISLAND_CONFIGS, getIslandHeroImage } from '@/lib/island-config'
import {
  fetchArticles,
  fetchSocialVideos,
  fetchTravelerStories,
} from '@/lib/sanity/queries'
import {
  ARTICLE_CATEGORY_LABEL,
  SOCIAL_PLATFORM_LABEL,
  VIDEO_ACCENT_GRADIENT,
} from '@/lib/sanity/types'

/**
 * /explore — Discover ↔ Community.
 *
 * Wiring:
 *   - C.5: shipped with hardcoded articles.
 *   - C.7: Sanity-first with hardcoded fallback for Discover.
 *   - Session 13: re-aligned to canonical Studio schema. Community
 *     tab populated with hardcoded videos + stories ported from
 *     mobile.
 *   - Session 13 follow-up: Community tab also Sanity-first — fetches
 *     `socialVideo` and `travelerStory` documents from Studio when
 *     present, falls back to hardcoded content otherwise. Both
 *     fallbacks stay (decision #6 — graceful degradation always).
 *
 * Caching: revalidate every 5 minutes so newly-published Sanity
 * content appears in production without a deploy. The page is
 * otherwise static (no per-user personalization yet).
 *
 * Auth: public visitors can browse. Saving, booking, and trip mutation
 * are gated by the destination route.
 */
export const revalidate = 300

export const metadata = {
  title: 'Explore | Baha Buddy',
  description: 'Editorial guides, hidden gems, and community moments from across the Bahamas.',
}

// ─── Article fallback ───────────────────────────────────────────────────────

const FALLBACK_ARTICLES: DiscoverArticle[] = [
  {
    slug: 'pink-sand-harbour-island',
    title: "Where to find pink sand: Harbour Island's complete guide",
    excerpt:
      "Why it's pink, the best time of day to see the color pop, where to stay, and the boutique you didn't know about.",
    category: 'Beaches',
    readTime: '7 min',
    imageUrl: BahaImages.harbourIsland,
    buddyPrompt: "Tell me everything about Pink Sands Beach on Harbour Island — when to go, where to stay, what to do nearby.",
  },
  {
    slug: 'swimming-pigs-exuma',
    title: 'Swimming pigs: how to visit (and which tour to skip)',
    excerpt:
      'The pigs are real, the photos are too good to be true, and not all tours are equal. Here is how the locals do it.',
    category: 'Experiences',
    readTime: '5 min',
    imageUrl: BahaImages.swimmingPigs,
    buddyPrompt: "I want to swim with the pigs in Exuma. Recommend the best tour and tell me how to get there.",
  },
  {
    slug: 'andros-diving',
    title: "Andros for divers: the world's third-largest barrier reef explained",
    excerpt:
      'Blue holes, wall dives, and the spots most tourists never reach. A first-timer-friendly primer.',
    category: 'Adventure',
    readTime: '9 min',
    imageUrl: BahaImages.andros,
    buddyPrompt: "I want to dive in Andros for the first time. Where should I stay and which dive operators are best?",
  },
  {
    slug: 'nassau-100-dollars-a-day',
    title: "Nassau on $100/day: budget travel that doesn't suck",
    excerpt:
      'Skip the cruise-port traps. Eat where the locals eat. Three full days in the capital for less than dinner at Atlantis.',
    category: 'Budget',
    readTime: '8 min',
    imageUrl: BahaImages.nassau,
    buddyPrompt: "Plan me 3 days in Nassau on a $100/day budget. Local food and free things only — no tourist traps.",
  },
  {
    slug: 'abacos-sailing',
    title: 'Sailing the Abacos: a 5-day route for first-time skippers',
    excerpt:
      "Hope Town, Green Turtle Cay, and the protected waters that make the Abacos the easiest sailing in the Caribbean.",
    category: 'Sailing',
    readTime: '11 min',
    imageUrl: BahaImages.abacos,
    buddyPrompt: "I want to sail the Abacos for 5 days. Suggest a route and tell me where to charter from.",
  },
  {
    slug: 'foodie-hidden-gems',
    title: "Where the locals eat: 7 spots tourists never find",
    excerpt:
      'Fish fry hideouts, conch shacks with a line down the road, and one restaurant the chef would rather you not tell anyone about.',
    category: 'Food',
    readTime: '6 min',
    imageUrl: BahaImages.bahamasLifestyle,
    buddyPrompt: "Tell me about hidden-gem restaurants in the Bahamas where locals actually eat.",
  },
]

// ─── Community fallbacks (ported from mobile in Session 13) ─────────────────

const FALLBACK_SOCIAL_VIDEOS: SocialVideo[] = [
  {
    id: 'swim-pigs',
    title: 'Swimming with pigs in Exuma!',
    creator: '@islandhopper',
    platformLabel: 'TikTok',
    viewsLabel: '2.3M views',
    imageUrl: BahaImages.swimmingPigs,
    overlayClass: VIDEO_ACCENT_GRADIENT.sky,
    buddyPrompt: 'I saw a video of swimming with pigs in Exuma, help me plan that',
  },
  {
    id: 'pink-sand',
    title: 'Harbour Island pink sand is REAL',
    creator: '@travelwithlex',
    platformLabel: 'Instagram',
    viewsLabel: '890K views',
    imageUrl: BahaImages.harbourIsland,
    overlayClass: VIDEO_ACCENT_GRADIENT.coral,
    buddyPrompt: 'I want to see the pink sand beach at Harbour Island',
  },
  {
    id: 'fish-fry',
    title: 'Nassau Fish Fry food tour',
    creator: '@foodiebahamas',
    platformLabel: 'TikTok',
    viewsLabel: '1.1M views',
    imageUrl: BahaImages.nassau,
    overlayClass: VIDEO_ACCENT_GRADIENT.amber,
    buddyPrompt: 'I want to do a food tour at Nassau Fish Fry',
  },
  {
    id: 'blue-hole',
    title: "Dean's Blue Hole is INSANE",
    creator: '@bahamasdiver',
    platformLabel: 'TikTok',
    viewsLabel: '1.8M views',
    imageUrl: BahaImages.longIsland,
    overlayClass: VIDEO_ACCENT_GRADIENT.brand,
    buddyPrompt: "I want to dive at Dean's Blue Hole in Long Island",
  },
  {
    id: 'exuma-cays',
    title: 'Exuma cays from above',
    creator: '@droneadventures',
    platformLabel: 'Instagram',
    viewsLabel: '650K views',
    imageUrl: BahaImages.exumas,
    overlayClass: VIDEO_ACCENT_GRADIENT.sky,
    buddyPrompt: 'I want to explore the Exuma cays',
  },
]

const FALLBACK_TRAVELER_STORIES: TravelerStory[] = [
  {
    id: 'sarah-mike',
    name: 'Sarah & Mike',
    trip: '5 days in Exuma',
    quote:
      'Buddy planned the perfect honeymoon. The swimming pigs were the highlight!',
    partyTypeLabel: 'Couple',
    partyToneClass: 'bg-gray-100 text-charcoal',
    avatarUrl: null,
  },
  {
    id: 'johnsons',
    name: 'The Johnsons',
    trip: '7 days island hopping',
    quote: 'Our kids still talk about Atlantis. Best family trip ever.',
    partyTypeLabel: 'Family',
    partyToneClass: 'bg-gray-100 text-charcoal',
    avatarUrl: null,
  },
  {
    id: 'marcus',
    name: 'Marcus',
    trip: '4 days solo in Long Island',
    quote:
      "Dean's Blue Hole was life-changing. Buddy found me spots no one else knows about.",
    partyTypeLabel: 'Solo',
    partyToneClass: 'bg-gray-100 text-charcoal',
    avatarUrl: null,
  },
]

const CATEGORIES = [
  { label: 'All', href: '/explore/places' },
  { label: 'Beaches', href: '/explore/places?category=Beach' },
  { label: 'Food', href: '/explore/places?category=Dining' },
  { label: 'Tours', href: '/explore/places?category=Activity&search=tour' },
  { label: 'Culture', href: '/explore/places?search=culture+history+museum' },
  { label: 'Hotels', href: '/stays?sort=stars' },
  { label: 'Transport', href: '/flights' },
] as const

const EXPERIENCE_CARDS = [
  {
    title: 'Pink sand and quiet beach days',
    eyebrow: 'Beaches',
    copy: 'Start with Harbour Island, Eleuthera, or Long Island when beach quality matters more than resort density.',
    image: BahaImages.harbourIsland,
    href: '/explore/places?category=Beach',
    prompt: 'Build a Bahamas beach day plan with pink sand, calm water, and good food nearby',
  },
  {
    title: 'Swimming pigs and Exuma cays',
    eyebrow: 'Tours',
    copy: 'Compare boat days, sandbars, snorkeling stops, and the practical route into Exuma.',
    image: BahaImages.swimmingPigs,
    href: '/nassau-cruise-itineraries',
    prompt: 'Help me plan an Exuma cays day with swimming pigs, snorkeling, and realistic timing',
  },
  {
    title: 'Culture, food, and Nassau energy',
    eyebrow: 'Culture',
    copy: 'Pair historic Nassau, Fish Fry, local dining, Junkanoo context, and nearby beaches.',
    image: BahaImages.nassau,
    href: '/restaurants',
    prompt: 'Plan a Nassau day around culture, local food, and beach time',
  },
]

const STAY_CARDS = [
  {
    title: 'Resorts and hotels',
    copy: 'Compare full-service stays for families, first trips, and easy beach access.',
    href: '/stays?type=Hotel',
    tripSeed: 'Help me compare Bahamas hotels and resorts with strong beach access, family fit, and easy arrival logistics.',
  },
  {
    title: 'Villas and homes',
    copy: 'Browse space-first stays for groups, longer trips, and quieter islands.',
    href: '/stays?type=Villa',
    tripSeed: 'Help me plan a Bahamas villa or home stay for a group with the right island, transport, and food access.',
  },
  {
    title: 'Apartments and condos',
    copy: 'Find practical bases near food, ferry access, or walkable town centers.',
    href: '/stays?type=Apartment',
    tripSeed: 'Help me find a practical Bahamas apartment or condo base near food, transport, and things to do.',
  },
]

const NEARBY_EXPERIENCE_CARDS = [
  {
    title: 'Beach days near your base',
    copy: 'Browse beaches and waterfront stops that can anchor a relaxed day without overplanning.',
    href: '/explore/places?category=Beach&search=nearby+beach',
    primaryLabel: 'View nearby',
    tripSeed: 'Build a Bahamas beach day near my stay with food, transport timing, and easy backup options.',
  },
  {
    title: 'Food stops around the island',
    copy: 'Use dining, local food, and cultural context to make a day feel specific to the island.',
    href: '/explore/places?category=Dining&search=local+food',
    primaryLabel: 'Find food',
    tripSeed: 'Plan a Bahamas food route near my island base with local restaurants, culture, and transport timing.',
  },
  {
    title: 'Tours with realistic timing',
    copy: 'Shortlist boat days, snorkel stops, culture walks, and activity windows before you commit.',
    href: '/explore/places?category=Activity&search=tour',
    primaryLabel: 'Check tours',
    tripSeed: 'Compare Bahamas tours with realistic pickup timing, island access, weather backup, and where to stay.',
  },
]

const TRANSPORT_CARDS = [
  {
    title: 'Flights to the islands',
    copy: 'Search live fares into Nassau, Exuma, Eleuthera, Freeport, Bimini, Andros, and the Abacos.',
    href: '/flights',
    tripSeed: 'Plan a Bahamas trip around live flights, airport choices, island timing, and where to stay.',
  },
  {
    title: 'Island access planning',
    copy: 'Compare flights, ferry-friendly islands, boat-day routing, transfers, and realistic island-hop timing.',
    href: '/explore/places?search=Airport+transfer+ferry+boat+transport',
    tripSeed: 'Plan Bahamas island access with flights, ferries, airport transfers, boat days, and realistic timing.',
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatReadTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return '5 min'
  return `${Math.round(minutes)} min`
}

/**
 * Keep public story badges neutral so party labels do not compete with
 * travel-commerce actions.
 */
function partyToneClass(partyType: string): string {
  return partyType ? 'bg-gray-100 text-charcoal' : 'bg-gray-100 text-gray-700'
}

function partyTypeLabel(partyType: string): string {
  // Capitalize first letter — Studio stores lowercase enum values.
  if (!partyType) return ''
  return partyType.charAt(0).toUpperCase() + partyType.slice(1)
}

function exploreTripHref(returnTo: string, seed: string): string {
  const params = new URLSearchParams()
  params.set('returnTo', returnTo)
  params.set('source', 'explore')
  params.set('seed', seed.replace(/\s+/g, ' ').trim().slice(0, 600))
  return `/dashboard/trips/new?${params.toString()}`
}

function exploreBuddyHref(seed: string): string {
  return buddyChatHref(seed)
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ExplorePage() {
  // Parallel fetches — three independent surfaces with their own
  // fallback rules. Promise.all means a slow Sanity response on one
  // doesn't block the others' fallbacks.
  const [sanityArticles, sanityVideos, sanityStories] = await Promise.all([
    fetchArticles(),
    fetchSocialVideos(),
    fetchTravelerStories(),
  ])

  // Discover articles
  const articles: DiscoverArticle[] =
    sanityArticles && sanityArticles.length > 0
      ? sanityArticles.map((a) => ({
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          // Studio category is an enum — render the human label.
          // Unknown categories pass through as-is so editors can add
          // new ones in the schema without code changes.
          category: ARTICLE_CATEGORY_LABEL[a.category] ?? a.category,
          readTime: formatReadTime(a.readTimeMinutes),
          imageUrl: a.imageUrl,
          // No dedicated buddyPrompt field in Studio — derive from
          // the title.
          buddyPrompt: `Tell me more about ${a.title}`,
        }))
      : FALLBACK_ARTICLES

  // Trending Videos
  const socialVideos: SocialVideo[] =
    sanityVideos && sanityVideos.length > 0
      ? sanityVideos.map((v) => ({
          id: v._id,
          title: v.title,
          creator: v.creator,
          platformLabel: SOCIAL_PLATFORM_LABEL[v.platform] ?? v.platform,
          viewsLabel: v.viewsLabel,
          // Studio thumbnails are required by schema, but defensive:
          // fall back to a stable hero photo if the URL somehow
          // resolves to null.
          imageUrl: v.imageUrl ?? BahaImages.bahamasLifestyle,
          overlayClass: VIDEO_ACCENT_GRADIENT[v.accentTone],
          buddyPrompt: v.buddyPrompt,
        }))
      : FALLBACK_SOCIAL_VIDEOS

  // Traveler Stories
  const travelerStories: TravelerStory[] =
    sanityStories && sanityStories.length > 0
      ? sanityStories.map((s) => ({
          id: s._id,
          name: s.name,
          trip: s.tripSummary,
          quote: s.quote,
          partyTypeLabel: partyTypeLabel(s.partyType),
          partyToneClass: partyToneClass(s.partyType),
          avatarUrl: s.avatarUrl,
        }))
      : FALLBACK_TRAVELER_STORIES

  return (
    <div className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Explore"
        title="Discover the Bahamas with Buddy"
        subtitle="Browse islands, beaches, food, tours, stays, and transport before you create an account. Save and book when you are ready."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Explore' },
        ]}
        actions={
          <>
            <Link href="/explore/places" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-brand-700">
              Browse places
            </Link>
            <Link href={exploreBuddyHref('Help me explore the Bahamas')} className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night hover:border-gray-400 hover:bg-gray-50">
              Ask Buddy
            </Link>
          </>
        }
      >
        <form action="/explore/places" className="grid gap-3 rounded-baha-lg border border-gray-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_auto]">
          <label className="sr-only" htmlFor="explore-search">Search Explore</label>
          <input
            id="explore-search"
            name="search"
            type="search"
            placeholder="Search islands, beaches, food, tours, hotels, or transport"
            className="min-h-11 rounded-baha-md border border-gray-200 bg-white px-4 text-sm font-semibold text-night placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100"
          />
          <button className="min-h-11 rounded-baha-md bg-brand-600 px-5 text-sm font-extrabold text-white hover:bg-brand-700">
            Search
          </button>
        </form>
        <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-extrabold text-charcoal hover:border-gray-400 hover:bg-gray-50 hover:text-night"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </CompactPageHeader>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <SectionHeader
          title="Explore Islands"
          copy="Start with the island, then drill into stays, food, activities, and transport."
          actionHref="/destinations"
          actionLabel="See all islands"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ISLAND_CONFIGS.slice(0, 8).map((island) => {
            const islandHref = `/explore/island/${island.slug}`
            const islandSeed = `Start a Bahamas trip around ${island.name}. Use this island context: ${island.tagline}`
            return (
              <article
                key={island.slug}
                className="group overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link href={islandHref} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2">
                  <div className="relative h-40 bg-gray-100">
                    <Image
                      src={getIslandHeroImage(island)}
                      alt={`${island.name}, Bahamas`}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <h2 className="text-lg font-extrabold">{island.name}</h2>
                      <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/85">{island.vibe}</p>
                    </div>
                  </div>
                </Link>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm leading-6 text-charcoal">{island.tagline}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href={islandHref} className="inline-flex items-center justify-center rounded-full bg-brand-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-brand-700">
                      View details
                    </Link>
                    <Link href={`/stays?island=${encodeURIComponent(island.name)}&sort=stars`} className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-extrabold text-night hover:border-gray-400 hover:bg-gray-50">
                      Check availability
                    </Link>
                    <Link href={exploreTripHref(islandHref, islandSeed)} className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-extrabold text-night hover:border-gray-400 hover:bg-gray-50">
                      Add to trip
                    </Link>
                    <Link href={exploreBuddyHref(`Help me plan around ${island.name}`)} className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-extrabold text-night hover:border-gray-400 hover:bg-gray-50">
                      Ask Buddy
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <SectionHeader title="Self-Guided Tours" copy="Use guided routes when you want stops, timing, map context, and Buddy support." actionHref="/nassau-cruise-itineraries" actionLabel="View tours" />
        <div className="grid gap-4 md:grid-cols-3">
          {EXPERIENCE_CARDS.map((card) => (
            <ExploreActionCard key={card.title} card={card} />
          ))}
        </div>

        <SectionHeader title="Nearby Experiences" copy="Start with the island base, then choose beaches, food, tours, and timing that fit the day." actionHref="/explore/places" actionLabel="Browse places" />
        <div className="grid gap-4 md:grid-cols-3">
          {NEARBY_EXPERIENCE_CARDS.map((card) => (
            <SimpleActionCard key={card.title} {...card} />
          ))}
        </div>

        <SectionHeader title="Where to Stay" copy="Filter by hotels, homes, villas, apartments, and condos, then check availability." actionHref="/stays" actionLabel="Search stays" />
        <div className="grid gap-4 md:grid-cols-3">
          {STAY_CARDS.map((card) => (
            <SimpleActionCard key={card.title} {...card} primaryLabel="Check availability" />
          ))}
        </div>

        <SectionHeader title="Food and Culture" copy="Restaurants are a discovery category in Explore, island pages, guides, and Buddy recommendations." actionHref="/restaurants" actionLabel="Browse restaurants" />
        <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h2 className="text-xl font-extrabold text-night">Build a food day around the island you choose</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal">
              Start with island context, then compare local food, waterfront dining, cultural stops, and transport timing.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
            <Link href="/restaurants" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-brand-700">
              View details
            </Link>
            <Link
              href={exploreTripHref('/restaurants', 'Plan a Bahamas food and culture day around restaurants, local food, island context, and nearby cultural stops.')}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-extrabold text-night hover:border-gray-400 hover:bg-gray-50"
            >
              Start food trip
            </Link>
            <Link href={exploreBuddyHref('Plan a Bahamas food and culture day')} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-extrabold text-night hover:border-gray-400 hover:bg-gray-50">
              Ask Buddy
            </Link>
          </div>
        </div>

        <SectionHeader title="Island Access" copy="Flights, transfers, ferries, boat days, and timing can decide whether a plan works." actionHref="/flights" actionLabel="Search flights" />
        <div className="grid gap-4 md:grid-cols-2">
          {TRANSPORT_CARDS.map((card) => (
            <SimpleActionCard key={card.title} {...card} primaryLabel="View details" />
          ))}
        </div>

        <section className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">Build from Explore</p>
            <h2 className="mt-2 text-2xl font-extrabold text-night">Save the ideas into a trip first</h2>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              Create the trip record, then add stays, flights, restaurants, tours, and places directly. Buddy can help refine the plan after the structure exists.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={exploreTripHref('/explore', 'Help me turn Bahamas Explore ideas into a trip with islands, stays, flights, food, and tours.')}
                className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-700"
              >
                Create trip from Explore
              </Link>
              <Link
                href={exploreBuddyHref('Help me choose what to do in the Bahamas')}
                className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-night hover:border-gray-400 hover:bg-gray-50"
              >
                Ask Buddy
              </Link>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            title="Discover and Community"
            copy="Guides, traveler stories, and social inspiration from across the islands."
          />
          <ExploreTabs
            articles={articles}
            socialVideos={socialVideos}
            travelerStories={travelerStories}
          />
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}

function SectionHeader({
  title,
  copy,
  actionHref,
  actionLabel,
}: {
  title: string
  copy: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-extrabold text-night">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal">{copy}</p>
      </div>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="text-sm font-extrabold text-night hover:text-gray-700">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function ExploreActionCard({
  card,
}: {
  card: {
    title: string
    eyebrow: string
    copy: string
    image: string
    href: string
    prompt: string
  }
}) {
  return (
    <article className="overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative h-44 bg-gray-100">
        <Image src={card.image} alt={card.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized />
      </div>
      <div className="p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">{card.eyebrow}</p>
        <h3 className="mt-2 text-lg font-extrabold text-night">{card.title}</h3>
        <p className="mt-2 text-sm leading-6 text-charcoal">{card.copy}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={card.href} className="rounded-full bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700">
            View details
          </Link>
          <Link href={exploreTripHref(card.href, card.prompt)} className="rounded-full border border-gray-300 px-4 py-2 text-xs font-extrabold text-night hover:border-gray-400 hover:bg-gray-50">
            Start trip
          </Link>
          <Link href={exploreBuddyHref(card.prompt)} className="rounded-full border border-gray-300 px-4 py-2 text-xs font-extrabold text-night hover:border-gray-400 hover:bg-gray-50">
            Ask Buddy
          </Link>
        </div>
      </div>
    </article>
  )
}

function SimpleActionCard({
  title,
  copy,
  href,
  primaryLabel,
  tripSeed,
}: {
  title: string
  copy: string
  href: string
  primaryLabel: string
  tripSeed?: string
}) {
  return (
    <article className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-extrabold text-night">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-charcoal">{copy}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={href} className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700">
          {primaryLabel}
        </Link>
        {tripSeed && (
          <Link
            href={exploreTripHref(href, tripSeed)}
            className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-extrabold text-night hover:border-gray-400 hover:bg-gray-50"
          >
            Start trip
          </Link>
        )}
      </div>
    </article>
  )
}
