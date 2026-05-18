'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BahaLogo, BuddyAvatar } from '@/components/ui'
import type { IslandHeroSlide } from '@/lib/islands'

const SLIDE_MS = 6000

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

const textShadow = '0 2px 20px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4)'

const heroTitleStyle: React.CSSProperties = {
  textShadow,
  boxShadow: '0px 4px 12px 0px rgba(0, 0, 0, 0.15)',
  borderWidth: 0,
  borderStyle: 'none',
  borderColor: 'transparent',
  borderImage: 'none',
}

export default function HeroSection({ slides }: { slides: IslandHeroSlide[] }) {
  const [query, setQuery] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    window.location.href = `/dashboard?q=${encodeURIComponent(query.trim())}`
  }

  const handleChip = (prompt: string) => {
    setQuery(prompt)
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
            style={{ textShadow }}
          >
            {slide.name}
            <span className="ml-1 opacity-80" aria-hidden>
              →
            </span>
          </Link>
          <p className="text-xs text-white/85 mt-1 line-clamp-2 leading-snug" style={{ textShadow }}>
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

      {/* Nav */}
      <header className="relative z-20 w-full bg-white border-b border-gray-200 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" priority />
          <nav className="flex items-center gap-4">
            <Link
              href="/destinations"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Destinations
            </Link>
            <Link
              href="/guides"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Guides
            </Link>
            <Link
              href="/deals"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Deals
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero content — centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div
          className="inline-flex items-center gap-2.5 bg-black/[0.02] backdrop-blur-md border border-white/30 rounded-full pl-1.5 pr-4 py-1.5 text-sm font-medium mb-8 tracking-wide"
          style={{ textShadow }}
        >
          <BuddyAvatar size="sm" state="greeting" className="shrink-0 ring-2 ring-white/35" />
          <span>Your AI Bahamas Travel Companion</span>
        </div>

        <h1
          className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.05] mb-5 max-w-3xl"
          style={heroTitleStyle}
        >
          Where in the{' '}
          <span className="text-gold-300">Bahamas</span>{' '}
          do you want to go?
        </h1>

        <p className="text-lg text-white/90 mb-10 max-w-lg leading-relaxed" style={{ textShadow }}>
          Tell Baha Buddy what you&apos;re dreaming of — we&apos;ll build your perfect island itinerary.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-5">
          <div className="flex gap-2 bg-black/30 backdrop-blur-md border border-white/35 rounded-2xl p-2 shadow-2xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about islands, beaches, hotels, activities..."
              className="flex-1 bg-transparent text-white placeholder-white/60 px-4 py-3 text-base outline-none min-w-0"
            />
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

        <div className="flex flex-wrap gap-3 justify-center mt-10">
          <a
            href="https://apps.apple.com/app/baha-buddy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-black/25 hover:bg-black/35 border border-white/30 backdrop-blur-sm text-white rounded-xl px-5 py-2.5 transition-colors text-sm font-medium"
            aria-label="Download on App Store"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-black/25 hover:bg-black/35 border border-white/30 backdrop-blur-sm text-white rounded-xl px-5 py-2.5 transition-colors text-sm font-medium"
            aria-label="Get on Google Play"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.18 23.76c.36.19.77.21 1.16.06l12.24-7.07-2.65-2.65-10.75 9.66zM.94 1.05C.36 1.52 0 2.28 0 3.26v17.47c0 .98.36 1.74.95 2.22l.12.1 9.77-9.77v-.23L1.06.95.94 1.05zM22.41 10.3l-2.79-1.61-2.99 2.99 2.99 2.99 2.81-1.62c.8-.46.8-1.21-.02-1.75zM4.34.18L16.58 7.25l-2.65 2.65L3.18.24A1.32 1.32 0 014.34.18z" />
            </svg>
            Google Play
          </a>
        </div>
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
