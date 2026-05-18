/**
 * Article content store — full bodies for the editorial articles surfaced
 * in Explore Discover.
 *
 * Keyed by slug. The same slugs appear in `FALLBACK_ARTICLES` in
 * /(dashboard)/explore/page.tsx — they're the source of truth for what
 * exists; this file is the source of truth for what's inside.
 *
 * Sanity-first migration plan: when `SanityDiscoverArticle` adds a
 * `body` field (Portable Text) and editors start publishing full
 * articles, the article detail page will prefer Sanity content and use
 * this store as the fallback. The schema in
 * `src/lib/sanity/schemas/discoverArticle.ts` should be extended at
 * that point.
 *
 * Article structure:
 *   - intro: 1-2 paragraph lead, sets the hook
 *   - sections: 3-4 body sections, each with a heading + 1-3 paragraphs
 *   - callout (optional): a highlighted aside ("Buddy's tip")
 *   - buddyPrompt: the prompt the "Plan this with Buddy" CTA opens chat with
 *
 * Body paragraphs are separated by double newlines (\n\n). The reader
 * splits on that pattern to render each as a <p>.
 */

import { BahaImages } from '@/lib/baha-images'

export interface ArticleContent {
  slug: string
  title: string
  /** One-line hook displayed below the title. */
  subtitle: string
  /** Category badge label. */
  category: string
  /** Reading-time estimate like "7 min". */
  readTime: string
  /** Hero image URL. */
  heroImage: string
  /** Lead paragraphs, separated by \n\n. */
  intro: string
  /** Body sections. */
  sections: { heading: string; body: string }[]
  /** Optional highlighted aside that breaks up the body. */
  callout?: { title: string; body: string }
  /** Pre-filled chat prompt for the "Plan this with Buddy" CTA. */
  buddyPrompt: string
}

export const ARTICLES: Record<string, ArticleContent> = {
  // ────────────────────────────────────────────────────────────────────
  'pink-sand-harbour-island': {
    slug: 'pink-sand-harbour-island',
    title: "Where to find pink sand: Harbour Island's complete guide",
    subtitle: "Why it's pink, the best time of day to see the color pop, and the boutique you didn't know about.",
    category: 'Beaches',
    readTime: '7 min',
    heroImage: BahaImages.harbourIsland,
    intro:
      "Three miles of soft, blush-pink sand stretches along the eastern edge of Harbour Island. It's been called one of the most beautiful beaches in the world by every magazine that bothers to rank such things — and unlike most superlatives in travel, this one holds up in person.\n\nThe pink isn't a filter. It comes from microscopic red foraminifera mixed with crushed coral and white sand. You won't see it from a satellite map, but the moment you step onto the beach in the morning sun, the color is unmistakable.",
    sections: [
      {
        heading: 'Why the sand is pink',
        body:
          "Tiny single-celled organisms called foraminifera live on the underside of the offshore reef. Their shells are a pale reddish-pink. When they die, wave action grinds the shells into fragments, mixes them with white sand and bits of coral, and washes the result onto the shore.\n\nThe color is most vivid in the early morning when the sun is low and the sand is wet from the tide retreating overnight. By midday the contrast washes out under direct overhead sun. Sunset gives you a different but equally photogenic palette — pink sand against a tangerine sky.",
      },
      {
        heading: 'Where to stay',
        body:
          "Harbour Island is small. You can walk the whole village of Dunmore Town in twenty minutes. Most hotels are either right on the pink sand or a short golf-cart ride away.\n\nThe legendary names — Pink Sands Resort, The Dunmore, Coral Sands — are all on the beach side and run $600-1500/night in season. For something quieter and more local, Romora Bay on the harbor side has its own pool, a great restaurant, and you're still five minutes from the pink sand by cart.",
      },
      {
        heading: 'Getting around',
        body:
          "Everyone rents a golf cart. There's no other way to do it — the island is too small for taxis and too big to walk everywhere. A two-seater runs about $80/day, a four-seater about $120. Reserve before you arrive in high season.\n\nDriving is on the left, which sounds confusing but matters less than you'd think because you're going 15mph max. The narrow lanes between pastel cottages are part of the charm.",
      },
      {
        heading: "What's actually there",
        body:
          "Beyond the beach: snorkeling on the reef just offshore (rent gear from any hotel), bone fishing the flats with a guide, the famous lunch at The Landing on the harbor side, and an art gallery scene that punches well above the island's weight. The island has about 2,000 residents and feels both refined and unfussy.\n\nNightlife is intentionally low-key. The Rock House bar and Sip Sip restaurant are the social anchors. If you want clubs and crowds, you came to the wrong island — and that's exactly the point.",
      },
    ],
    callout: {
      title: "Buddy's tip",
      body: "Plan to arrive at the beach by 7:30am at least one morning. You'll have the pink sand to yourself for an hour and the color is best in that first light. Bring coffee. Most hotels will pack one to-go.",
    },
    buddyPrompt:
      "I want to plan a trip to Harbour Island. Tell me when to go, where to stay, and what else to do beyond the pink sand beach.",
  },

  // ────────────────────────────────────────────────────────────────────
  'swimming-pigs-exuma': {
    slug: 'swimming-pigs-exuma',
    title: 'Swimming pigs: how to visit (and which tour to skip)',
    subtitle:
      "The pigs are real, the photos are too good to be true, and not all tours are equal. Here's how the locals do it.",
    category: 'Experiences',
    readTime: '5 min',
    heroImage: BahaImages.swimmingPigs,
    intro:
      "The swimming pigs of Exuma are at this point the single most-Instagrammed Bahamas experience. Big Major Cay — also known as Pig Beach — is a tiny uninhabited island where a small population of feral pigs lives and, yes, swims out to greet boats in the hope of getting fed.\n\nIt's real. It's also more nuanced than the social media version suggests.",
    sections: [
      {
        heading: 'The two ways to get there',
        body:
          "Option one: book a guided day trip from Nassau. These tours are heavily marketed, run all day, and bundle in stops at Iguana Beach, Thunderball Grotto, and the sandbar at sunset. You spend roughly 90 minutes total at Pig Beach itself, with maybe a dozen other groups arriving on similar schedules. Plan on $200-400 per person.\n\nOption two: stay on Exuma or one of the surrounding cays (Staniel Cay is the closest base) and take a half-day local tour. Smaller groups, more time with the pigs, far less Nassau-to-Pig-Beach travel time. About $150-200 per person.",
      },
      {
        heading: 'Which tour operators are actually good',
        body:
          "The reputable Exuma-based operators include Four C's Adventures, Robinson's Charters, and Captain Marshall — all locally owned and they treat the pigs (and the tourists) well.\n\nFrom Nassau, Powerboat Adventures runs the best of the larger trips: smaller groups than Bahamas Air Tours, faster boats than the catamarans, lunch included. Avoid the ultra-cheap day trips advertised on cruise ports — they overload boats and rush you through.",
      },
      {
        heading: "What you don't see on Instagram",
        body:
          "Don't feed the pigs from your hand. Don't feed them anything except what your guide brings (usually pieces of vegetables; bread is bad for them). Don't try to ride them. Don't bring them into deep water for a photo — they're not strong swimmers, and a few have drowned in recent years from over-handling.\n\nThis is a fragile little tourist economy built on a sensitive ecosystem. The good operators know this and brief you carefully. The bad ones don't.",
      },
      {
        heading: 'Best time to go',
        body:
          "Year-round tours run, but November to April is the calmest sea and most reliable weather. June through October you may get bumpy boat rides and the occasional cancellation. Mid-morning visits are best — earlier than 9am you sometimes get to the cay before the pigs are interested in coming out.",
      },
    ],
    buddyPrompt:
      "I want to visit the swimming pigs in Exuma. Recommend the best tour for a small group and tell me where to stay nearby.",
  },

  // ────────────────────────────────────────────────────────────────────
  'andros-diving': {
    slug: 'andros-diving',
    title: "Andros for divers: the world's third-largest barrier reef explained",
    subtitle:
      'Blue holes, wall dives, and the spots most tourists never reach. A first-timer-friendly primer.',
    category: 'Adventure',
    readTime: '9 min',
    heroImage: BahaImages.andros,
    intro:
      "Andros is the biggest island in the Bahamas by a wide margin, and the least developed. It sits west of Nassau across the Tongue of the Ocean — a 6,000-foot-deep underwater canyon that pulls cool, nutrient-rich water onto the island's barrier reef.\n\nThat reef is the third largest on Earth, behind only Australia's and Belize's. And almost nobody dives it.",
    sections: [
      {
        heading: 'Why Andros is special',
        body:
          "The Andros Barrier Reef runs 190 miles down the eastern shore. Two miles offshore the reef wall drops vertically into the Tongue of the Ocean — a wall dive in 80°F water with visibility that regularly hits 100 feet. Spotted eagle rays, reef sharks, and the occasional hammerhead patrol the wall edge.\n\nAnd then there are the blue holes. Andros has more inland blue holes than any other place on Earth — vertical underwater caverns formed during the last ice age. Some are open-water sinkholes; some require advanced cave diver certification. The most famous are Captain Bill's Blue Hole and Stargate.",
      },
      {
        heading: 'Where to base yourself',
        body:
          "Most divers stay on the central coast near Fresh Creek or Andros Town. Small Hope Bay Lodge is the legendary spot — an all-inclusive dive resort that's been running since 1960 and trains a lot of the divers you meet elsewhere in the Caribbean. Tiamo Resort and Kamalame Cay are the luxury options, both with private dive ops.\n\nIf you want to be near Captain Bill's, stay in the Cargill Creek area. For South Andros and the bonefish flats, base in Driggs Hill or Congo Town.",
      },
      {
        heading: 'For your first time diving Andros',
        body:
          "You don't need to be an advanced diver. The reef sites in shallow water (30-60ft) are gentle and the visibility makes them easy to navigate. Dive operators will assess your level on the first dive and group you accordingly.\n\nWall dives and cave dives require more experience. Most operators won't take you on a true cave dive without Cavern Diver certification at minimum. The wall edge can be done at 80ft and most certified open-water divers can handle it with a guide.",
      },
      {
        heading: 'When to come',
        body:
          "March through September is best for diving. The water is warmest and the visibility most reliable. Late summer brings the occasional storm but also the best wildlife — manta rays, schools of jacks, the rare bull shark.\n\nDecember through February is also fine, just cooler. You'll want a 5mm wetsuit instead of a 3mm.",
      },
    ],
    callout: {
      title: "Buddy's tip",
      body: "If you're combining Andros with another island, fly Andros first while you're fresh. The diving's the main event and the rest of the islands are easier on tired legs. Quick 25-minute hop from Nassau on Western Air.",
    },
    buddyPrompt:
      "I want to dive in Andros for the first time. Where should I stay, what's the best dive operator, and which weeks should I avoid?",
  },

  // ────────────────────────────────────────────────────────────────────
  'nassau-100-dollars-a-day': {
    slug: 'nassau-100-dollars-a-day',
    title: "Nassau on $100/day: budget travel that doesn't suck",
    subtitle:
      'Skip the cruise-port traps. Eat where the locals eat. Three full days in the capital for less than dinner at Atlantis.',
    category: 'Budget',
    readTime: '8 min',
    heroImage: BahaImages.nassau,
    intro:
      "Nassau gets dismissed as a resort port — and if you only see Bay Street and Atlantis, that's fair. But the locals' Nassau, the one off the cruise grid, is one of the most rewarding cheap cities in the Caribbean.\n\n$100/day covers a clean private guesthouse room, three real meals, a few rum punches, and one paid activity. Here's how it breaks down.",
    sections: [
      {
        heading: 'Where to stay ($30-50/night)',
        body:
          "Skip the resort strip. Look for guesthouses and small Airbnbs in the residential neighborhoods east of downtown — Eastern Road, Centreville, or Fox Hill. Clean private rooms with AC and wifi run $30-50/night and you're still 10-15 minutes from town by jitney.\n\nThe key is reading recent reviews. Some 'budget' listings have given up on basic maintenance. A good filter: only book places with at least 20 reviews from the last six months.",
      },
      {
        heading: 'How to eat for $15/day',
        body:
          "Conch fritters at Potter's Cay under the Paradise Island Bridge: $7 for a generous serving. The vendors there are run by local fishermen who landed the conch that morning.\n\nFor lunch, look for any storefront with 'snack' or 'takeaway' in the name. A plate of stew fish or curry chicken with peas-and-rice, plantains, and macaroni costs $8-12 and feeds you for the day. Bahamian Cookin' Restaurant, just off Bay Street, is the famous example, but every neighborhood has its own.\n\nDinner Friday or Saturday: Fish Fry at Arawak Cay. Pick any stall with a line. $15 gets you a fresh-grilled snapper, sides, and a coconut. The Goldie's and Twin Brothers stalls are the institutions.",
      },
      {
        heading: "What to actually do",
        body:
          "Free things: walk through downtown (Government House, Parliament Square, the Queen's Staircase), wander the Straw Market (haggle or just look), swim at Junkanoo Beach (free, in the middle of town), tour Fort Charlotte (free entry, small donation for the guide).\n\nWorth paying for: the Pirates of Nassau museum ($15 — much better than the name suggests), and one snorkel trip out to a reef. Stuart Cove's snorkel boat is $80 for the half-day with all gear. That's your one splurge.",
      },
      {
        heading: 'Getting around',
        body:
          "Jitneys (local buses) cost $1.25 anywhere on the island. They run constantly until about 7pm. After dark, taxis are $10-15 to most places — share with other travelers when possible.\n\nWalking distance covers downtown plus the western tip (where Arawak Cay is). For Cable Beach or further east, take the jitney.",
      },
    ],
    callout: {
      title: "Buddy's tip",
      body: "Three days is plenty for Nassau itself. If you have a week, do two days in Nassau, then a $90 round-trip ferry to Spanish Wells or a $60 flight to Andros. The contrast is the whole point of the Bahamas.",
    },
    buddyPrompt:
      "Plan me 3 days in Nassau on a $100/day budget. Local food and free things only — no tourist traps. I want to do it right.",
  },

  // ────────────────────────────────────────────────────────────────────
  'abacos-sailing': {
    slug: 'abacos-sailing',
    title: 'Sailing the Abacos: a 5-day route for first-time skippers',
    subtitle:
      'Hope Town, Green Turtle Cay, and the protected waters that make the Abacos the easiest sailing in the Caribbean.',
    category: 'Sailing',
    readTime: '11 min',
    heroImage: BahaImages.abacos,
    intro:
      "The Abacos are an island chain in the northern Bahamas shaped like a 90-mile-long lagoon. The main islands form a barrier against the Atlantic, and inside the chain — the Sea of Abaco — the water stays flat, the wind stays consistent, and the navigation stays simple.\n\nIt's the friendliest sailing in the Caribbean. You can charter your own boat with bareboat certification and never lose sight of land.",
    sections: [
      {
        heading: 'Where to charter from',
        body:
          "Marsh Harbour is the hub. The Moorings and Sunsail both run sizable bareboat fleets out of the Conch Inn Marina. Boats range from 38ft monohulls (good for couples) up to 50ft catamarans (room for six adults comfortably).\n\nBudget: $4,500-9,000 for a week, all in, depending on boat size and season. Provisioning runs another $400-600 per person for the week.",
      },
      {
        heading: 'Suggested 5-day route',
        body:
          "Day 1: Sail from Marsh Harbour to Hope Town (Elbow Cay). 4 nautical miles. Pick up a mooring ball in the harbor — anchoring is restricted. Climb the candy-striped Hope Town Lighthouse at sunset.\n\nDay 2: Sail to Tahiti Beach at the south end of Elbow Cay. Anchor for lunch and snorkeling. Continue to Little Harbour to see Pete's Pub.\n\nDay 3: Back north to Man-O-War Cay. Tour the boatbuilding shop, eat at the Hibiscus Cafe, walk the loop trail. Sleep on the mooring or sail across to Marsh Harbour for resupply.\n\nDay 4: Long sail north to Green Turtle Cay. About 25 nautical miles, your biggest day. Anchor in White Sound or pick up a Bluff House mooring. Have dinner at Pineapples.\n\nDay 5: Sail back south. If you have time, stop at Treasure Cay Beach (one of the National Geographic top-10 beaches in the world) for a swim. Back to Marsh Harbour by evening.",
      },
      {
        heading: 'What you need to charter',
        body:
          "Bareboat certification from one of the recognized schools (ASA 104 Bareboat Cruising or RYA Day Skipper). The charter companies want to see it, and they'll do their own brief check-out before handing you the keys.\n\nIf nobody in your group has certification, hire a captain for the week. Adds $1,200-1,800 but they handle navigation and you focus on the fun. Many groups do the first day captained and then take over.",
      },
      {
        heading: 'Best time',
        body:
          "April through June: warm, light winds, easy sailing. October through November: cooler, more reliable wind, fewer charters available. December through March: peak season, more expensive, the highest demand for boats.\n\nAvoid August and September — hurricane season peak. The Abacos took a serious hit from Hurricane Dorian in 2019; the recovery is well underway but some infrastructure is still rebuilding. Check current conditions before booking late summer.",
      },
    ],
    callout: {
      title: "Buddy's tip",
      body: "Provision out of Marsh Harbour. Maxwell's Supermarket has everything; Brown's Bakery does sandwiches and bread to go. Don't try to provision in Hope Town — the village store is for emergencies only, prices are 2-3x mainland.",
    },
    buddyPrompt:
      "I want to sail the Abacos for 5 days with my partner. Suggest a route, tell me where to charter from, and what time of year works best.",
  },

  // ────────────────────────────────────────────────────────────────────
  'foodie-hidden-gems': {
    slug: 'foodie-hidden-gems',
    title: 'Where the locals eat: 7 spots tourists never find',
    subtitle:
      "Fish fry hideouts, conch shacks with a line down the road, and one restaurant the chef would rather you not tell anyone about.",
    category: 'Food',
    readTime: '6 min',
    heroImage: BahaImages.bahamasLifestyle,
    intro:
      "Every Bahamas restaurant guide lists the same dozen places. They're not bad. They're just not where Bahamians actually eat on a Tuesday night.\n\nThis is a deliberately incomplete list. Some of the best spots get a sentence; some get a paragraph. You'll have to do some of the work yourself — and that's the whole point.",
    sections: [
      {
        heading: 'Nassau: Goldie\'s at Arawak Cay',
        body:
          "Fish Fry at Arawak Cay has fifteen stalls. Goldie's is the one with the line. Order the snapper, fried, with peas-and-rice, plantains, and macaroni. Get a Kalik. Stand. Eat. It costs $18.\n\nGo on a Friday or Saturday night when the live band is playing. The vibe is what makes it; the food just confirms it.",
      },
      {
        heading: 'Nassau: Tay Hong on East Street',
        body:
          "Tiny Chinese-Bahamian restaurant a few blocks south of downtown. Nobody who isn't local knows it. The kitchen does Chinese classics with Bahamian seafood — stir-fried conch, fried fish with garlic black bean sauce, the lunch special soup. $12 lunch, takeaway only.",
      },
      {
        heading: 'Eleuthera: 1648 Bar & Grille',
        body:
          "Governor's Harbour. Local-owned, sunset views off the back deck, the bartender knows everyone. The lobster (when it's in season) is split, grilled with butter and Old Sour, and worth the trip. Off-season the cracked conch is the move.",
      },
      {
        heading: 'Harbour Island: Sip Sip',
        body:
          "Open lunch only. Pink building on the bluff above Pink Sands Beach. The lobster quesadilla is the famous order, but the conch chowder is better. Show up at 12:00 sharp or the wait is an hour.",
      },
      {
        heading: 'Exuma: Santanna\'s Bar & Grille',
        body:
          "Little Exuma, on the road to Tropic of Cancer Beach. Open-air, sand floor, run by a family. The grouper fingers are the best in the country. Cash only. Closed Sunday.",
      },
      {
        heading: 'Bimini: Joe\'s Conch Shack',
        body:
          "Right on the beach in Alice Town. Conch salad made in front of you with onion, tomato, pepper, lime, orange juice, and the conch he scrubbed and trimmed thirty seconds before you walked up. $12. Bring a beer; they don't sell alcohol.",
      },
      {
        heading: 'Andros: The Big Yard',
        body:
          "Outside Behring Point. No sign, no menu, no website. You ask around in Behring Point for the Big Yard and someone walks you over. The owner cooks one fish a night, whatever was good that morning. About $20 with two sides. Don't ask for substitutions.",
      },
    ],
    callout: {
      title: "Buddy's tip",
      body: "The best test of a Bahamian restaurant is whether the menu changes day to day. If it's the same menu every visit, the kitchen isn't sourcing the catch — they're using freezers. The places where the menu shifts with the boats are the ones to trust.",
    },
    buddyPrompt:
      "Tell me about hidden-gem restaurants in the Bahamas where locals actually eat. I want under-the-radar spots, not tourist traps.",
  },
}

/** Look up an article by slug. Returns null if not found. */
export function getArticle(slug: string): ArticleContent | null {
  return ARTICLES[slug] ?? null
}

/** Get all article slugs (used by generateStaticParams). */
export function getAllArticleSlugs(): string[] {
  return Object.keys(ARTICLES)
}
