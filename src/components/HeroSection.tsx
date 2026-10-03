'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import MarketplacePublicHeader from '@/components/marketplace/MarketplacePublicHeader'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import { BuddyAvatar } from '@/components/ui'
import MarketingHeroSearch from '@/components/marketing/MarketingHeroSearch'
import type { IslandHeroSlide } from '@/lib/islands'
import { canOptimizeImageSrc } from '@/lib/next-image-hosts'
import { createClient } from '@/lib/supabase/client'

// 720p web encodes of the 3s-25s clip of the original 1080p master
// (baha-buddy-hero-nassau-paradise-1080p.mp4, kept in /public as the source).
// The encodes are already trimmed, so the clip runs from 0s to its end.
const HERO_VIDEO_START_SECONDS = 0
const HERO_VIDEO_END_SECONDS = 22
const HERO_VIDEO_SOURCES = [
  { src: '/assets/home/baha-buddy-hero-nassau-paradise-720p.webm', type: 'video/webm' },
  { src: '/assets/home/baha-buddy-hero-nassau-paradise-720p.mp4', type: 'video/mp4' },
] as const

// The video is decoration: skip it (poster image only) on phones, for
// reduced-motion users, and on data-saver / slow connections. Everyone else
// keeps the DB-sourced island photo as the poster.
const HERO_VIDEO_MIN_WIDTH_QUERY = '(min-width: 768px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const HERO_VIDEO_SLOW_CONNECTIONS = new Set(['slow-2g', '2g', '3g'])

type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

function getNetworkInformation(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection
}

/**
 * Only fetch the clip on a wide viewport (the min-width query must match, so
 * an unknown viewport gets the poster), without a reduced-motion preference,
 * and without data-saver or a slow effective connection.
 */
export function shouldLoadHeroVideo(
  win: Pick<Window, 'matchMedia'>,
  connection: NetworkInformationLike | undefined = getNetworkInformation(),
): boolean {
  if (!win.matchMedia(HERO_VIDEO_MIN_WIDTH_QUERY).matches) return false
  if (win.matchMedia(REDUCED_MOTION_QUERY).matches) return false
  if (connection?.saveData) return false
  if (connection?.effectiveType && HERO_VIDEO_SLOW_CONNECTIONS.has(connection.effectiveType)) return false
  return true
}

function subscribeToMediaQuery(query: MediaQueryList, listener: () => void): () => void {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }
  query.addListener(listener)
  return () => query.removeListener(listener)
}

/** Wide, soft halo for headlines and body copy on photos */
const heroTextShadow =
  '0 2px 48px rgba(0,0,0,0.28), 0 1px 14px rgba(0,0,0,0.2)'

type HeroSectionProps = {
  slides: IslandHeroSlide[]
  userEmail?: string | null
  userDisplayName?: string | null
}

export default function HeroSection({
  slides,
  userEmail: initialUserEmail,
  userDisplayName: initialUserDisplayName,
}: HeroSectionProps) {
  // Decided on the client after mount so the server markup (poster image
  // only) is identical for every visitor and the page stays cacheable.
  const [showVideoBackground, setShowVideoBackground] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail ?? null)
  const [userDisplayName, setUserDisplayName] = useState<string | null>(initialUserDisplayName ?? null)
  const [authLoading, setAuthLoading] = useState(initialUserEmail === undefined)
  const heroVideoRef = useRef<HTMLVideoElement | null>(null)

  // Server may return an empty list if the DB is unreachable AND the
  // static fallback path returned nothing. Defensive guard so we don't
  // crash on slides[0] in that edge case. This image sits behind the
  // video as a poster/fallback.
  const fallbackSlide = slides[0]

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const wideScreen = window.matchMedia(HERO_VIDEO_MIN_WIDTH_QUERY)
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
    const connection = getNetworkInformation()
    const syncVideoEligibility = () => setShowVideoBackground(shouldLoadHeroVideo(window, connection))

    syncVideoEligibility()
    const unsubscribeWidth = subscribeToMediaQuery(wideScreen, syncVideoEligibility)
    const unsubscribeMotion = subscribeToMediaQuery(reducedMotion, syncVideoEligibility)
    connection?.addEventListener?.('change', syncVideoEligibility)

    return () => {
      unsubscribeWidth()
      unsubscribeMotion()
      connection?.removeEventListener?.('change', syncVideoEligibility)
    }
  }, [])

  useEffect(() => {
    if (!showVideoBackground) return

    const video = heroVideoRef.current
    if (!video) return

    let resumeFrame: number | null = null

    // Set both the property and content attributes before every play attempt.
    // This covers Safari versions that evaluate muted/inline autoplay from the
    // parsed attributes rather than only from React's assigned properties.
    const prepareForInlineAutoplay = () => {
      video.muted = true
      video.defaultMuted = true
      video.playsInline = true
      video.setAttribute('muted', '')
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', 'true')
    }

    const seekToClipStart = () => {
      try {
        video.currentTime = HERO_VIDEO_START_SECONDS
      } catch {
        // Metadata is not available yet. loadedmetadata/canplay will retry.
      }
    }

    const requestPlayback = () => {
      prepareForInlineAutoplay()
      if (video.currentTime < HERO_VIDEO_START_SECONDS || video.currentTime >= HERO_VIDEO_END_SECONDS) {
        seekToClipStart()
      }

      if (!video.paused) return
      const playback = video.play()
      playback?.catch(() => {
        // Muted autoplay can still be deferred by low-power/data-saving modes.
        // canplay, pageshow, visibilitychange, and pause retries remain active.
      })
    }

    const schedulePlayback = () => {
      if (document.visibilityState !== 'visible' || resumeFrame !== null) return
      resumeFrame = window.requestAnimationFrame(() => {
        resumeFrame = null
        requestPlayback()
      })
    }

    const keepHeroVideoInClip = () => {
      if (video.currentTime < HERO_VIDEO_START_SECONDS || video.currentTime >= HERO_VIDEO_END_SECONDS) {
        seekToClipStart()
      }
    }

    const restartHeroVideo = () => {
      seekToClipStart()
      requestPlayback()
    }

    const resumeWhenVisible = () => {
      if (document.visibilityState === 'visible') schedulePlayback()
    }

    prepareForInlineAutoplay()
    requestPlayback()
    video.addEventListener('loadedmetadata', restartHeroVideo)
    video.addEventListener('canplay', requestPlayback)
    video.addEventListener('timeupdate', keepHeroVideoInClip)
    video.addEventListener('ended', restartHeroVideo)
    video.addEventListener('pause', schedulePlayback)
    document.addEventListener('visibilitychange', resumeWhenVisible)
    window.addEventListener('pageshow', schedulePlayback)
    window.addEventListener('pointerdown', requestPlayback, { passive: true })
    window.addEventListener('touchstart', requestPlayback, { passive: true })

    return () => {
      if (resumeFrame !== null) window.cancelAnimationFrame(resumeFrame)
      video.removeEventListener('loadedmetadata', restartHeroVideo)
      video.removeEventListener('canplay', requestPlayback)
      video.removeEventListener('timeupdate', keepHeroVideoInClip)
      video.removeEventListener('ended', restartHeroVideo)
      video.removeEventListener('pause', schedulePlayback)
      document.removeEventListener('visibilitychange', resumeWhenVisible)
      window.removeEventListener('pageshow', schedulePlayback)
      window.removeEventListener('pointerdown', requestPlayback)
      window.removeEventListener('touchstart', requestPlayback)
    }
  }, [showVideoBackground])

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    let latestRequest = 0
    // The saved profile name (users.display_name) wins over auth metadata,
    // as it did when the home page read it on the server. One lookup per user.
    const profileNames = new Map<string, Promise<string | null>>()

    type HeroAuthUser = { id: string; email?: string | null; user_metadata?: unknown } | null | undefined

    const applyUser = async (user: HeroAuthUser, emailFallback: string | null) => {
      const request = ++latestRequest
      const nextEmail = user?.email ?? emailFallback
      let profileName: string | null = null
      if (user?.id) {
        if (!profileNames.has(user.id)) profileNames.set(user.id, getProfileDisplayName(supabase, user.id))
        profileName = await profileNames.get(user.id)!
      }
      // Keep the loading state until the name is known so the greeting does
      // not flip between two names; ignore results overtaken by a newer event.
      if (!mounted || request !== latestRequest) return
      setUserEmail(nextEmail)
      setUserDisplayName(
        profileName
          ?? getAuthDisplayName(user?.user_metadata)
          ?? getInitialDisplayNameForEmail(nextEmail, initialUserEmail, initialUserDisplayName),
      )
      setAuthLoading(false)
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      void applyUser(data.user, initialUserEmail ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      void applyUser(session?.user, null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialUserEmail, initialUserDisplayName])

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden text-white">
      {/* Homepage video background with a DB-sourced island photo fallback. */}
      <div className="absolute inset-0">
        {fallbackSlide && (
          <Image
            src={fallbackSlide.image}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
            // Local and allowlisted poster images go through the optimiser;
            // any other host would be rejected by it, so serve it as-is.
            unoptimized={!canOptimizeImageSrc(fallbackSlide.image)}
          />
        )}
        {showVideoBackground && (
          <video
            ref={heroVideoRef}
            data-testid="hero-background-video"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={fallbackSlide?.image}
            controls={false}
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            tabIndex={-1}
            aria-hidden="true"
          >
            {HERO_VIDEO_SOURCES.map((source) => (
              <source key={source.src} src={source.src} type={source.type} />
            ))}
          </video>
        )}
        <div className="absolute inset-0" aria-hidden />
      </div>

      {/* Public marketplace nav */}
      <div className="relative z-20 w-full">
        <MarketplacePublicHeader
          userEmail={userEmail}
          displayName={userDisplayName}
          authLoading={authLoading}
          activePath="/"
        />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-10 md:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div
            className="mb-6 inline-flex items-center gap-2.5 py-1.5 text-sm font-bold text-white"
            style={{ textShadow: heroTextShadow }}
          >
            <BuddyAvatar size="sm" state="greeting" className="shrink-0" />
            <span>AI Bahamas travel companion</span>
          </div>

          <h1
            className="max-w-4xl text-5xl font-bold leading-tight"
            style={{ textShadow: heroTextShadow }}
          >
            <span className="block sm:inline">Plan, book, and</span>{' '}
            <span className="block sm:inline">
              experience The <span className="text-gold-300">Bahamas</span>
            </span>{' '}
            <span className="block sm:inline">with Buddy.</span>
          </h1>

          <div className="mt-6 w-full sm:mt-8">
            {/**
              MarketingHeroSearch is the direct-intent marketplace panel:
              Plan a Trip, Stays, Flights, and Things to Do. The homepage
              keeps Buddy as the planning hook while direct commerce paths
              stay visible above the fold.
            */}
            <MarketingHeroSearch />
          </div>

          <StoreBadgeLinks className="mt-6 justify-center" />
        </div>
      </div>
    </section>
  )
}

async function getProfileDisplayName(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
    const value = (data as { display_name?: unknown } | null)?.display_name
    if (typeof value !== 'string') return null
    return value.replace(/\s+/g, ' ').trim() || null
  } catch {
    return null
  }
}

function getAuthDisplayName(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return null

  const record = metadata as Record<string, unknown>
  for (const key of ['display_name', 'full_name', 'name']) {
    const value = record[key]
    if (typeof value !== 'string') continue

    const normalized = value.replace(/\s+/g, ' ').trim()
    if (normalized) return normalized
  }

  return null
}

function getInitialDisplayNameForEmail(
  nextEmail: string | null,
  initialUserEmail?: string | null,
  initialUserDisplayName?: string | null,
) {
  if (!nextEmail || nextEmail !== initialUserEmail) return null
  return initialUserDisplayName ?? null
}
