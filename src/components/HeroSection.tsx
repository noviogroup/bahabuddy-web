'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MarketingTopBar from '@/components/MarketingTopBar'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import { BahaLogo, BuddyAvatar } from '@/components/ui'
import MarketingHeroSearch from '@/components/marketing/MarketingHeroSearch'
import type { IslandHeroSlide } from '@/lib/islands'

const SLIDE_MS = 6000

/** Wide, soft halo for headlines and body copy on photos */
const heroTextShadow =
  '0 2px 48px rgba(0,0,0,0.28), 0 1px 14px rgba(0,0,0,0.2)'

/** Lighter spread for nav and smaller labels */
const navTextShadow =
  '0 1px 32px rgba(0,0,0,0.22), 0 1px 8px rgba(0,0,0,0.16)'

export default function HeroSection({ slides }: { slides: IslandHeroSlide[] }) {
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
        {/* Light overlay — photos stay vivid; bottom gradient for hero text */}
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
        <div className="absolute bottom-6 left-4 sm:left-6 z-10 max-w-xs text-left pointer-events-auto">
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
            <nav className="flex items-center gap-4 sm:gap-5">
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
                href="/concierge-trip-plan"
                className="text-sm font-bold text-white hover:text-white/85 transition-colors hidden sm:block"
                style={{ textShadow: navTextShadow }}
              >
                Concierge
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

        {/**
          MarketingHeroSearch is the 4-tab structured search panel:
          Plan a Trip (chat input + rotating placeholder + suggestion
          chips), Stays, Flights, Things to Do. Replaces the pre-existing
          inline <form> + chips block — see MarketingHeroSearch.tsx for
          the full breakdown of the structured tabs.
        */}
        <MarketingHeroSearch />

        <div className="mt-5">
          <Link
            href="/concierge-trip-plan"
            className="inline-flex items-center justify-center rounded-full bg-white/15 border border-white/35 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-md hover:bg-white/25 transition-colors"
            style={{ textShadow: navTextShadow }}
          >
            Want local help? Pay for a Concierge Trip Plan →
          </Link>
        </div>

        <StoreBadgeLinks className="mt-8" />
      </div>
    </section>
  )
}
