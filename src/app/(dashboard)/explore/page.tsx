import ExploreTabs, {
  type DiscoverArticle,
  type SocialVideo,
  type TravelerStory,
} from '@/components/explore/ExploreTabs'
import { BahaImages } from '@/lib/baha-images'
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
 * Auth: handled by the (dashboard) route group layout.
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
    partyToneClass: 'bg-coral-50 text-coral-700',
    avatarUrl: null,
  },
  {
    id: 'johnsons',
    name: 'The Johnsons',
    trip: '7 days island hopping',
    quote: 'Our kids still talk about Atlantis. Best family trip ever.',
    partyTypeLabel: 'Family',
    partyToneClass: 'bg-palm-50 text-palm-700',
    avatarUrl: null,
  },
  {
    id: 'marcus',
    name: 'Marcus',
    trip: '4 days solo in Long Island',
    quote:
      "Dean's Blue Hole was life-changing. Buddy found me spots no one else knows about.",
    partyTypeLabel: 'Solo',
    partyToneClass: 'bg-brand-50 text-brand-700',
    avatarUrl: null,
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatReadTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return '5 min'
  return `${Math.round(minutes)} min`
}

/**
 * Map Studio's partyType machine values to the same tone classes the
 * hardcoded fallback uses. Friends gets gold; the others mirror the
 * original Session 13 mapping.
 */
function partyToneClass(partyType: string): string {
  switch (partyType) {
    case 'solo':
      return 'bg-brand-50 text-brand-700'
    case 'couple':
      return 'bg-coral-50 text-coral-700'
    case 'family':
      return 'bg-palm-50 text-palm-700'
    case 'friends':
      return 'bg-gold-50 text-gold-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function partyTypeLabel(partyType: string): string {
  // Capitalize first letter — Studio stores lowercase enum values.
  if (!partyType) return ''
  return partyType.charAt(0).toUpperCase() + partyType.slice(1)
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
          imageUrl: a.imageUrl ?? BahaImages.nassau,
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
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-night">Explore</h1>
        <p className="text-sm text-gray-500 mt-1">
          Editorial guides written for travelers who want more than the brochure version.
        </p>
      </div>

      <ExploreTabs
        articles={articles}
        socialVideos={socialVideos}
        travelerStories={travelerStories}
      />
    </main>
  )
}
