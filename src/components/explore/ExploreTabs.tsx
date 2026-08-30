'use client'

/**
 * ExploreTabs — Discover ↔ Community segmented tabs for /explore.
 *
 * History:
 *   - C.5 (March 2026): shipped hardcoded editorial content for
 *     Discover and a "coming soon" treatment for Community.
 *   - C.7 (March 2026): Discover swapped to Sanity-first content.
 *   - D.7 (April 2026): card hero migrated to next/image.
 *   - Session 12 (May 2026): Article cards link to
 *     /explore/articles/[slug] instead of opening chat. Mobile UX spec
 *     calls for "Read more" + "Plan this" on every Explore card.
 *   - Session 13 (May 2026): Community tab populated with content
 *     ported from mobile's `_CommunityContent`. Initial version held
 *     the videos + stories as in-file constants.
 *   - Session 13 follow-up: Community content lifted up — videos and
 *     stories now come in as props from the parent server page so
 *     they can be Sanity-driven (via `fetchSocialVideos` /
 *     `fetchTravelerStories`) with hardcoded fallback. Adds avatar
 *     image support to traveler stories.
 *
 * Client component because of the tab state. All Sanity fetches happen
 * server-side in the parent page — we just receive the resolved data
 * as plain props. Concrete planning CTAs create a trip draft directly
 * and keep Buddy as contextual support rather than the only path forward.
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SegmentedToggle } from '@/components/ui'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { editorialTripHref } from '@/lib/editorial-planning-links'

// ─── Public interfaces ─────────────────────────────────────────────────────
// These are what the parent server page must pass in. The page maps
// Sanity documents (or hardcoded fallbacks) into these shapes.

export interface DiscoverArticle {
  slug: string
  title: string
  excerpt: string
  /** Category badge label (pre-translated from Studio's enum). */
  category: string
  /** "7 min" reading estimate. */
  readTime: string
  imageUrl: string | null
  /** Pre-filled chat prompt — used on the article detail page's Plan
   *  with Buddy CTA. Kept on the card-level interface so a single
   *  source feeds both surfaces. */
  buddyPrompt: string
}

export interface SocialVideo {
  id: string
  title: string
  creator: string
  /** Pre-titlecased ("TikTok" / "Instagram" / "YouTube"). */
  platformLabel: string
  /** Display string like "2.3M views". */
  viewsLabel: string
  imageUrl: string
  /** Pre-resolved Tailwind gradient class string (e.g.
   *  "from-brand-900/30 via-brand-900/55 to-cyan-700/80"). */
  overlayClass: string
  buddyPrompt: string
}

export interface TravelerStory {
  id: string
  name: string
  /** Short trip summary line ("5 days in Exuma"). */
  trip: string
  quote: string
  /** Pre-titlecased party type ("Solo" / "Couple" / "Family" /
   *  "Friends"). */
  partyTypeLabel: string
  /** Pre-resolved Tailwind class string for the pill. */
  partyToneClass: string
  /** Optional traveler photo. When null, the card renders the first
   *  initial of the name in a colored circle. */
  avatarUrl: string | null
}

interface ExploreTabsProps {
  articles: DiscoverArticle[]
  socialVideos: SocialVideo[]
  travelerStories: TravelerStory[]
}

type Tab = 'discover' | 'community'

export default function ExploreTabs({
  articles,
  socialVideos,
  travelerStories,
}: ExploreTabsProps) {
  const [tab, setTab] = useState<Tab>('discover')

  return (
    <>
      {/* Tabs */}
      <div className="mb-6">
        <SegmentedToggle<Tab>
          value={tab}
          onChange={setTab}
          aria-label="Explore view"
          options={[
            { value: 'discover',  label: 'Discover' },
            { value: 'community', label: 'Community' },
          ]}
        />
      </div>

      {tab === 'discover' && <DiscoverGrid articles={articles} />}
      {tab === 'community' && (
        <CommunityContent
          socialVideos={socialVideos}
          travelerStories={travelerStories}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Discover tab — editorial cards
// ──────────────────────────────────────────────────────────────────────────

function DiscoverGrid({ articles }: { articles: DiscoverArticle[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {articles.map(article => {
        const articleHref = `/explore/articles/${article.slug}`
        const startTripHref = editorialTripHref({
          returnTo: articleHref,
          source: 'article',
          seed: article.buddyPrompt || `Use this Bahamas article as planning context: ${article.title}. ${article.excerpt}`,
        })

        return (
          <article
            key={article.slug}
            className="group block text-left bg-white rounded-baha-lg border border-gray-200 overflow-hidden shadow-soft hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <Link
              href={articleHref}
              aria-label={`Read ${article.title}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
            >
              <ImageWithSourcePolicy
                src={article.imageUrl}
                alt={article.title}
                title={article.title}
                eyebrow={article.category}
                className="h-44"
                imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                tone="island"
              >
                <span className="absolute top-3 left-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold uppercase text-night">
                  {article.category}
                </span>
                <span className="absolute bottom-3 right-3 z-10 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
                  {article.readTime}
                </span>
              </ImageWithSourcePolicy>
            </Link>

            <div className="p-4">
              <h3 className="font-bold text-night text-base leading-snug">
                <Link href={articleHref} className="transition-colors hover:text-gray-700">
                  {article.title}
                </Link>
              </h3>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                {article.excerpt}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href={articleHref}
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                >
                  Read article
                </Link>
                <Link
                  href={startTripHref}
                  className="inline-flex items-center justify-center rounded-full bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
                >
                  Start trip
                </Link>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Community tab — Trending Videos + Traveler Stories + Share CTA
// ──────────────────────────────────────────────────────────────────────────

interface CommunityContentProps {
  socialVideos: SocialVideo[]
  travelerStories: TravelerStory[]
}

function CommunityContent({ socialVideos, travelerStories }: CommunityContentProps) {
  return (
    <div className="space-y-10">
      {/* Trending Videos */}
      {socialVideos.length > 0 && (
        <section aria-labelledby="trending-videos-heading">
          <div className="flex items-baseline justify-between mb-4">
            <h2 id="trending-videos-heading" className="text-lg font-bold text-night">
              Trending Videos
            </h2>
            <p className="text-xs text-gray-400">From travelers across the islands</p>
          </div>

          {/* Horizontal scroll on mobile, grid on larger screens.
              Scrollbar hiding works without a Tailwind plugin via
              arbitrary variants: [&::-webkit-scrollbar]:hidden covers
              WebKit/Blink, [scrollbar-width:none] covers Firefox. */}
          <div className="-mx-4 px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:overflow-visible">
            <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 pb-2 sm:pb-0">
              {socialVideos.map(video => (
                <SocialVideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Traveler Stories */}
      {travelerStories.length > 0 && (
        <section aria-labelledby="traveler-stories-heading">
          <div className="flex items-baseline justify-between mb-4">
            <h2 id="traveler-stories-heading" className="text-lg font-bold text-night">
              Traveler Stories
            </h2>
            <p className="text-xs text-gray-400">Real Baha Buddy trips</p>
          </div>

          <div className="space-y-3">
            {travelerStories.map(story => (
              <TravelerStoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}

      {/* Share Your Trip CTA — always rendered */}
      <ShareYourTripPanel />
    </div>
  )
}

// ─── Social Video Card ──────────────────────────────────────────────────────

function SocialVideoCard({ video }: { video: SocialVideo }) {
  const planHref = editorialTripHref({
    returnTo: '/explore',
    source: 'social_video',
    seed: video.buddyPrompt || `Use this Bahamas video as planning context: ${video.title}.`,
  })

  return (
    <article className="group relative w-[180px] sm:w-auto aspect-[3/4] sm:aspect-[4/5] flex-shrink-0 rounded-baha-lg overflow-hidden shadow-card focus-within:ring-2 focus-within:ring-gray-300 focus-within:ring-offset-2">
      {/* Background image */}
      <Image
        src={video.imageUrl}
        alt=""
        fill
        sizes="(max-width: 640px) 180px, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Dark gradient overlay (tone varies per card) */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${video.overlayClass}`}
        aria-hidden="true"
      />

      {/* Play-button affordance (decorative — real playback in a later
          phase when we wire actual oEmbed iframes) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
          <svg
            className="w-7 h-7 text-white drop-shadow"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Content stack at the bottom */}
      <div className="absolute inset-x-3 bottom-3 text-white">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="bg-white/25 backdrop-blur-sm text-xs font-semibold uppercase px-1.5 py-0.5 rounded">
            {video.platformLabel}
          </span>
          <span className="text-xs text-white/80">{video.viewsLabel}</span>
        </div>
        <h3 className="text-sm font-semibold leading-snug line-clamp-2">
          {video.title}
        </h3>
        <p className="text-xs text-white/70 mt-0.5">{video.creator}</p>
        <Link
          href={planHref}
          className="mt-2.5 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-night transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Start from video
        </Link>
      </div>
    </article>
  )
}

// ─── Traveler Story Card ────────────────────────────────────────────────────

function TravelerStoryCard({ story }: { story: TravelerStory }) {
  const initial = story.name.charAt(0).toUpperCase()

  return (
    <article className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
      <header className="flex items-center gap-3 mb-3">
        {/* Avatar: image when provided, initial circle as fallback */}
        {story.avatarUrl ? (
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
            <Image
              src={story.avatarUrl}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-full bg-gray-100 text-charcoal flex items-center justify-center font-bold text-sm flex-shrink-0"
            aria-hidden="true"
          >
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-night truncate">{story.name}</p>
          <p className="text-xs text-gray-500 truncate">{story.trip}</p>
        </div>
        <span className={`${story.partyToneClass} text-xs font-semibold uppercase px-2 py-1 rounded-full flex-shrink-0`}>
          {story.partyTypeLabel}
        </span>
      </header>
      <blockquote className="text-sm text-gray-700 italic leading-relaxed">
        “{story.quote}”
      </blockquote>
    </article>
  )
}

// ─── Share Your Trip panel ──────────────────────────────────────────────────

/**
 * Share Your Trip CTA. No-op on click for now — same as mobile, where
 * the upload flow is reserved for a later phase. Renders as a button
 * (not a link) so it's clearly an action rather than navigation.
 *
 * When the UGC upload flow lands, this becomes a Link to /share or
 * opens an upload modal in place.
 */
function ShareYourTripPanel() {
  return (
    <section
      aria-labelledby="share-trip-heading"
      className="rounded-baha-lg border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8"
    >
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"
        aria-hidden="true"
      >
        <svg className="h-6 w-6 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h2 id="share-trip-heading" className="text-lg font-bold text-night mb-1.5">
        Share Your Trip
      </h2>
      <p className="text-sm text-gray-600 max-w-sm mx-auto mb-5 leading-relaxed">
        Back from the Bahamas? Share your story and inspire other travelers.
      </p>
      <button
        type="button"
        disabled
        title="Upload coming soon"
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-500 opacity-80"
      >
        Upload Content
        <span className="rounded bg-white px-1.5 py-0.5 text-xs uppercase text-gray-500">
          Soon
        </span>
      </button>
    </section>
  )
}
