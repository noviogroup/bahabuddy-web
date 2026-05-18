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
 * Fallback behavior unchanged: when Sanity has nothing, we use the
 * hardcoded pool of 4 picks and the click still goes to chat with a
 * pre-filled prompt, since there's no article page to send them to.
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
  /** Where to send the user on tap. Articles → reader; fallback picks
   *  → chat with a pre-filled prompt. */
  href: string
}

const FALLBACK_PICKS: Array<Omit<Pick, 'href'> & { imageKey?: BahaImageKey; chatPrompt: string }> = [
  {
    imageKey: 'sunsetSailing',
    imageUrl: BahaImages.sunsetSailing,
    headline: 'Sunset sailing from Nassau Harbor',
    hook: 'Two hours, a cold drink, and the best view in the country.',
    chatPrompt: 'Tell me about sunset sailing from Nassau Harbor',
  },
  {
    imageKey: 'swimmingPigs',
    imageUrl: BahaImages.swimmingPigs,
    headline: 'Swim with the pigs in Exuma',
    hook: "The bucket-list experience that's somehow even better than the photos.",
    chatPrompt: 'Plan a day trip to swim with the pigs at Big Major Cay',
  },
  {
    imageKey: 'eleuthera',
    imageUrl: BahaImages.eleuthera,
    headline: "Eleuthera's pink sand beaches",
    hook: 'Quietly stunning — the kind of place you keep to yourself.',
    chatPrompt: 'Tell me about the pink sand beaches in Eleuthera',
  },
  {
    imageKey: 'bimini',
    imageUrl: BahaImages.bimini,
    headline: 'Bimini for the day from Miami',
    hook: 'Closer than you think. Fast ferry, white sand, dinner back home.',
    chatPrompt: 'Plan a day trip from Miami to Bimini',
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
    }))
  } else {
    picks = FALLBACK_PICKS.map(p => ({
      imageUrl: p.imageUrl,
      headline: p.headline,
      hook: p.hook,
      // Fallback picks have no article — drop into chat.
      href: `/dashboard/chat?q=${encodeURIComponent(p.chatPrompt)}`,
    }))
  }

  const week = isoWeek(new Date())
  const pick = picks[week % picks.length]

  return (
    <section aria-label="Buddy's pick this week">
      {/* Mini header */}
      <div className="flex items-center gap-2 px-5 md:px-6 mb-3">
        <span className="w-1 h-5 bg-gold-500 rounded-full" aria-hidden="true" />
        <h2 className="text-base md:text-lg font-bold text-night">Buddy&apos;s Pick</h2>
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
          overlay="left"
        />
      </div>
    </section>
  )
}
