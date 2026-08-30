/**
 * BuddyPickCard — single editorial recommendation with gold accent.
 *
 * Mobile reference: BuddyPicksCard in lib/features/home/widgets/home_sections.dart
 *
 * Wiring:
 *   - C.7 (March 2026): pulled from a placeholder `buddyPick` document
 *     type that lived only in the web's local schemas.
 *   - Session 13 (May 2026): the canonical Studio at /Baha Buddy/studio/
 *     doesn't have a dedicated BuddyPick type. Instead, the equivalent
 *     editor workflow is to flip the `featured` boolean on an Article.
 *     This card now pulls from `fetchFeaturedArticles` and, when one is
 *     present, links to the article reader rather than dropping the
 *     user into chat. Editorial intent stays intact; the click target
 *     is now "Read the article" by default, which mirrors the rest of
 *     the Explore surface (chat is the action layer, articles are the
 *     content layer — decision #26).
 *
 * Fallback behavior: when Sanity has nothing, we use the hardcoded pool
 * of 4 picks and route each pick to the best direct product surface.
 * Concrete marketplace actions should not default back into chat.
 *
 * Rotation: deterministic ISO-week — every user sees the same pick
 * during the same calendar week regardless of source.
 *
 * Server component because of the Sanity fetch.
 */

import { HeroCard } from '@/components/ui'
import { BahaImages, type BahaImageKey } from '@/lib/baha-images'
import { fetchFeaturedArticles } from '@/lib/sanity/queries'

interface Pick {
  imageUrl: string
  headline: string
  hook: string
  /** Where to send the user on tap. Articles go to the reader; fallback
   *  picks go to direct marketplace, Explore, or trip creation surfaces. */
  href: string
  ctaLabel: string
}

function withParams(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}

function newTripHref(input: { destination: string; seed: string }): string {
  return withParams('/dashboard/trips/new', {
    source: 'buddy_pick',
    destination: input.destination,
    seed: input.seed,
  })
}

export const BUDDY_PICK_FALLBACKS: Array<Pick & { imageKey?: BahaImageKey }> = [
  {
    imageKey: 'sunsetSailing',
    imageUrl: BahaImages.sunsetSailing,
    headline: 'Sunset sailing from Nassau Harbor',
    hook: 'Two hours, a cold drink, and the best view in the country.',
    href: withParams('/explore/places', {
      island: 'nassau-paradise-island',
      search: 'sunset sailing Nassau Harbor',
      category: 'Water Activity',
    }),
    ctaLabel: 'View sailing options',
  },
  {
    imageKey: 'swimmingPigs',
    imageUrl: BahaImages.swimmingPigs,
    headline: 'Swim with the pigs in Exuma',
    hook: "The bucket-list experience that's somehow even better than the photos.",
    href: withParams('/explore/places', {
      island: 'the-exumas',
      search: 'swimming pigs Big Major Cay',
      category: 'Activity',
    }),
    ctaLabel: 'View tours',
  },
  {
    imageKey: 'eleuthera',
    imageUrl: BahaImages.eleuthera,
    headline: "Eleuthera's pink sand beaches",
    hook: 'Quietly stunning — the kind of place you keep to yourself.',
    href: withParams('/explore/places', {
      island: 'eleuthera-harbour-island',
      search: 'pink sand beach',
      category: 'Beach',
    }),
    ctaLabel: 'Explore beaches',
  },
  {
    imageKey: 'bimini',
    imageUrl: BahaImages.bimini,
    headline: 'Bimini for the day from Miami',
    hook: 'Closer than you think. Fast ferry, white sand, dinner back home.',
    href: newTripHref({
      destination: 'bimini',
      seed: 'Bimini day trip from Miami with transportation, beach time, food, and a realistic return plan.',
    }),
    ctaLabel: 'Start this trip',
  },
]

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
}

export default async function BuddyPickCard() {
  // Try Sanity-curated featured articles first. When at least one is
  // featured, we route the user to the article reader on tap.
  const featuredArticles = await fetchFeaturedArticles()

  let picks: Pick[]
  if (featuredArticles && featuredArticles.length > 0) {
    picks = featuredArticles.map(a => ({
      imageUrl: a.imageUrl ?? BahaImages.nassau,
      headline: a.title,
      hook: a.excerpt,
      href: `/explore/articles/${a.slug}`,
      ctaLabel: 'Read guide',
    }))
  } else {
    picks = BUDDY_PICK_FALLBACKS
  }

  const week = isoWeek(new Date())
  const pick = picks[week % picks.length]

  return (
    <section aria-label="Buddy's pick this week">
      {/* Mini header */}
      <div className="flex items-center gap-2 px-5 md:px-6 mb-3">
        <h2 className="text-base font-bold text-night">Buddy&apos;s Pick</h2>
      </div>

      <div className="px-5 md:px-6">
        <HeroCard
          imageUrl={pick.imageUrl}
          alt={pick.headline}
          height="h-44 md:h-52"
          badge="THIS WEEK"
          badgeColor="gold"
          title={pick.headline}
          subtitle={pick.hook}
          href={pick.href}
          ctaLabel={pick.ctaLabel}
          overlay="left"
        />
      </div>
    </section>
  )
}
