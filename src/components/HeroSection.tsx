'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MarketingTopBar from '@/components/MarketingTopBar'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import { BahaLogo, BuddyAvatar } from '@/components/ui'
import type { IslandHeroSlide } from '@/lib/islands'

const SLIDE_MS = 6000
const PLACEHOLDER_MS = 2000
const PLACEHOLDER_FADE_MS = 400

/** Rotating input hints — aligned with QUICK_CHIPS prompts below */
const ROTATING_PLACEHOLDERS = [
  'Plan a trip to see the swimming pigs in Exuma…',
  'Best snorkeling spots in Nassau…',
  'Plan an Exuma Cays day trip itinerary…',
  'Best nightlife spots in Nassau…',
  'Plan a family beach vacation in the Bahamas…',
  'Romantic things to do in Harbour Island…',
  'Visit Seven Mile Beach in Andros…',
  'Best local seafood and food tours…',
] as const

const QUICK_CHIPS = [
  { label: 'Swimming Pigs (Exuma)', prompt: 'Plan a trip to see the swimming pigs in Exuma' },
  { label: 'Snorkeling in Nassau', prompt: 'Best snorkeling spots in Nassau Bahamas' },
  { label: 'Exuma Cays day trip', prompt: 'Plan an Exuma Cays day trip itinerary' },
  { label: 'Nassau nightlife', prompt: 'Best nightlife spots in Nassau Bahamas' },
  { label: 'Family beach holiday', prompt: 'Plan a family beach vacation in the Bahamas' },
  { label: 'Romantic Harbour Island', prompt: 'Romantic things to do in Harbour Island Bahamas' },
  { label: 'Seven Mile Beach, Andros', prompt: 'Plan a visit to Seven Mile Beach in Andros Bahamas' },
  { label: 'Local seafood tour', prompt: 'Best local seafood restaurants and food tours in the Bahamas' },
]

/** Wide, soft halo for headlines and body copy on photos */
const heroTextShadow =
  '0 2px 48px rgba(0,0,0,0.28), 0 1px 14px rgba(0,0,0,0.2)'

/** Lighter spread for nav and smaller labels */
const navTextShadow =
  '0 1px 32px rgba(0,0,0,0.22), 0 1px 8px rgba(0,0,0,0.16)'

export default function HeroSection({ slides }: { slides: IslandHeroSlide[] }) {
  const [query, setQuery] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)

  // Server may return an empty list if the DB is unreachable AND the
  // static fallback path returned nothing. Defensive guard so we don't
  // crash on slides[0] in that edge case.
  const slide = slides[slideIndex] ?? slides[0]

  useEffect(() => {
    if (slides.length <= 1) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length)
    }, SLIDE_MS)
    return () => window.clearInterval(id)
  }, [slides.length])

  useEffect(() => {
    if (query.trim()) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let fadeTimeoutId: number | undefined

    const intervalId = window.setInterval(() => {
      setPlaceholderVisible(false)
      fadeTimeoutId = window.setTimeout(() => {
        setPlaceholderIndex((i) => (i + 1) % ROTATING_PLACEHOLDERS.length)
        setPlaceholderVisible(true)
      }, PLACEHOLDER_FADE_MS)
    }, PLACEHOLDER_MS)

    return () => {
      window.clearInterval(intervalId)
      if (fadeTimeoutId !== undefined) window.clearTimeout(fadeTimeoutId)
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    window.location.href = `/dashboard?q=${encodeURIComponent(query.trim())}`
  }

  const handleChip = (prompt: string) => {
    setQuery(prompt)
    setPlaceholderVisible(true)
  }

  return (
    <section className="relative overflow-hidden min-h-screen flex flex-col text-white">
      {/* Rotating island hero photos — sourced from islands table (server-fetched in app/page.tsx) */}
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <Image
            key={s.slug}
            src={s.image}
            alt={`${s.name}, Bahamas`}
            fill
            priority={i === 0}
            className={`object-cover object-center transition-opacity duration-[1400ms] ease-in-out ${
              i === slideIndex ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="100vw"
            unoptimized
          />
        ))}
        {/* Light overlay — photos stay vivid; bottom gradient for text + stats only */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/45"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"
          aria-hidden
        />
      </div>

      {/* Island label — ties each photo to a destination */}
      {slide && (
        <div className="absolute bottom-28 left-4 sm:left-6 z-10 max-w-xs text-left pointer-events-auto">
          <Link
            href={`/explore/island/${slide.slug}`}
            className="inline-block text-sm font-bold tracking-wide text-white hover:text-gold-200 transition-colors"
            style={{ textShadow: navTextShadow }}
          >
            {slide.name}
            <span className="ml-1 opacity-80" aria-hidden>
              →
            </span>
          </Link>
          <p className="text-xs text-white/85 mt-1 line-clamp-2 leading-snug" style={{ textShadow: navTextShadow }}>
            {slide.tagline}
          </p>
          {slides.length > 1 && (
            <div className="flex gap-1.5 mt-3" role="tablist" aria-label="Hero destinations">
              {slides.map((s, i) => (
                <button
                  key={s.slug}
                  type="button"
                  role="tab"
                  aria-selected={i === slideIndex}
                  aria-label={s.name}
                  onClick={() => setSlideIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === slideIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Promo bar + nav — sticky together over hero */}
      <div className="sticky top-0 z-20 w-full">
        <MarketingTopBar />
        <header className="relative w-full">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" layout="pillWordmark" priority />
          <nav className="flex items-center gap-5">
            <Link
              href="/destinations"
              className="text-sm font-bold text-white hover:text-white/85 transition-colors hidden sm:block"
              style={{ textShadow: navTextShadow }}
            >
              Destinations
            </Link>
            <Link
              href="/guides"
              className="text-sm font-bold text-white hover:text-white/85 transition-colors hidden sm:block"
              style={{ textShadow: navTextShadow }}
            >
              Guides
            </Link>
            <Link
              href="/deals"
              className="text-sm font-bold text-white hover:text-white/85 transition-colors hidden sm:block"
              style={{ textShadow: navTextShadow }}
            >
              Deals
            </Link>
            <Link
              href="/login"
              className="text-sm font-bold text-white hover:text-white/85 transition-colors"
              style={{ textShadow: navTextShadow }}
            >
              Sign in
            </Link>
          </nav>
          </div>
        </header>
      </div>

      {/* Hero content — centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div
          className="inline-flex items-center gap-2.5 bg-black/[0.02] backdrop-blur-md border border-white/30 rounded-full pl-1.5 pr-4 py-1.5 text-sm font-medium mb-8 tracking-wide"
          style={{ textShadow: heroTextShadow }}
        >
          <BuddyAvatar size="sm" state="greeting" className="shrink-0 ring-2 ring-white/35" />
          <span>Your AI Bahamas Travel Companion</span>
        </div>

        <h1
          className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.05] mb-5 max-w-3xl"
          style={{ textShadow: heroTextShadow }}
        >
          Where in the{' '}
          <span className="text-gold-300">Bahamas</span>{' '}
          do you want to go?
        </h1>

        <p className="text-lg text-white/90 mb-10 max-w-lg leading-relaxed" style={{ textShadow: heroTextShadow }}>
          Tell Baha Buddy what you&apos;re dreaming of — we&apos;ll build your perfect island itinerary.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-5">
          <div className="flex gap-2 bg-black/30 backdrop-blur-md border border-white/35 rounded-2xl p-2 shadow-2xl">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Ask Baha Buddy about your Bahamas trip"
                className="relative z-10 w-full bg-transparent text-white px-4 py-3 text-base outline-none min-w-0"
              />
              {!query && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-4 right-4 top-1/2 z-0 -translate-y-1/2 truncate text-left text-base text-white/60 transition-opacity duration-300 ease-in-out ${
                    placeholderVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {ROTATING_PLACEHOLDERS[placeholderIndex]}
                </span>
              )}
            </div>
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white rounded-xl px-5 py-3 font-semibold text-sm transition-colors flex items-center gap-2 flex-shrink-0 shadow-lg"
            >
              Plan my trip
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </form>

        <div className="w-full max-w-3xl overflow-x-auto pb-1 -mx-4 px-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChip(chip.prompt)}
                className="bg-black/25 hover:bg-black/35 active:bg-black/40 backdrop-blur-md border border-white/25 text-white text-sm rounded-full px-4 py-2 transition-all shadow-sm whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <StoreBadgeLinks className="mt-10" />
      </div>

      <div className="relative z-10 border-t border-white/15 bg-[rgb(246,201,85)] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '700+', label: 'Islands & Cays' },
              { value: 'AI', label: 'Smart Itineraries' },
              { value: 'Free', label: 'To Download' },
              { value: '24/7', label: 'Travel Assistant' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/70 mt-0.5 tracking-wide uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
