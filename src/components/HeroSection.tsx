'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import MarketplacePublicHeader from '@/components/marketplace/MarketplacePublicHeader'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import { BuddyAvatar } from '@/components/ui'
import MarketingHeroSearch from '@/components/marketing/MarketingHeroSearch'
import { shouldOptimizeImageSrc } from '@/components/marketplace/ImageWithSourcePolicy'
import type { IslandHeroSlide } from '@/lib/islands'
import { createClient } from '@/lib/supabase/client'

const HERO_VIDEO_START_SECONDS = 3
const HERO_VIDEO_END_SECONDS = 25
const HERO_VIDEO_SRC = '/assets/home/baha-buddy-hero-nassau-paradise-1080p.mp4'
// Keep the start hint for browsers that support media fragments, but manage
// the clip end ourselves. Mobile Safari can stop at a fragment end instead of
// honoring `loop`, which leaves an autoplay background paused on its last frame.
const HERO_VIDEO_CLIP_SRC = `${HERO_VIDEO_SRC}#t=${HERO_VIDEO_START_SECONDS}`

// The hero clip is a large 1080p file. Only fetch it where it adds value:
// wide viewports, no reduced-motion preference, and no data-saver / slow
// connection. Everyone else keeps the DB-sourced island photo.
const HERO_VIDEO_NARROW_QUERY = '(max-width: 767px)'
const HERO_VIDEO_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
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

export function shouldLoadHeroVideo(
  win: Pick<Window, 'matchMedia'>,
  connection: NetworkInformationLike | undefined = getNetworkInformation(),
): boolean {
  if (win.matchMedia(HERO_VIDEO_REDUCED_MOTION_QUERY).matches) return false
  if (win.matchMedia(HERO_VIDEO_NARROW_QUERY).matches) return false
  if (connection?.saveData) return false
  if (connection?.effectiveType && HERO_VIDEO_SLOW_CONNECTIONS.has(connection.effectiveType)) return false
  return true
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
  // The video is added only after hydration, once we know the viewport,
  // motion preference and connection allow it. Phones (where post-hydration
  // insertion made iOS autoplay less reliable) never receive it at all.
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
    const queries = [
      window.matchMedia(HERO_VIDEO_REDUCED_MOTION_QUERY),
      window.matchMedia(HERO_VIDEO_NARROW_QUERY),
    ]
    const connection = getNetworkInformation()
    const syncVideoPreference = () => setShowVideoBackground(shouldLoadHeroVideo(window, connection))

    syncVideoPreference()
    for (const query of queries) {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', syncVideoPreference)
      } else {
        query.addListener(syncVideoPreference)
      }
    }
    connection?.addEventListener?.('change', syncVideoPreference)

    return () => {
      for (const query of queries) {
        if (typeof query.removeEventListener === 'function') {
          query.removeEventListener('change', syncVideoPreference)
        } else {
          query.removeListener(syncVideoPreference)
        }
      }
      connection?.removeEventListener?.('change', syncVideoPreference)
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

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return
      const nextEmail = data.user?.email ?? initialUserEmail ?? null
      setUserEmail(nextEmail)
      setUserDisplayName(
        getAuthDisplayName(data.user?.user_metadata) ?? getInitialDisplayNameForEmail(nextEmail, initialUserEmail, initialUserDisplayName),
      )
      setAuthLoading(false)

      // The homepage is statically cached, so the signed-in profile name
      // (users.display_name, preferred over auth metadata) is read here
      // instead of on the server.
      const userId = data.user?.id
      if (!userId) return
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', userId)
          .maybeSingle()
        const profileName = normalizeDisplayName(profile?.display_name)
        if (mounted && profileName) setUserDisplayName(profileName)
      } catch {
        // Keep the auth-metadata name.
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const nextEmail = session?.user?.email ?? null
      setUserEmail(nextEmail)
      setUserDisplayName(
        getAuthDisplayName(session?.user?.user_metadata) ?? getInitialDisplayNameForEmail(nextEmail, initialUserEmail, initialUserDisplayName),
      )
      setAuthLoading(false)
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
            unoptimized={!shouldOptimizeImageSrc(fallbackSlide.image)}
          />
        )}
        {showVideoBackground && (
          <video
            ref={heroVideoRef}
            data-testid="hero-background-video"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            src={HERO_VIDEO_CLIP_SRC}
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
          />
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

function normalizeDisplayName(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized || null
}

function getAuthDisplayName(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return null

  const record = metadata as Record<string, unknown>
  for (const key of ['display_name', 'full_name', 'name']) {
    const normalized = normalizeDisplayName(record[key])
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
