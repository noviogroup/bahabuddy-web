'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MarketplacePublicHeader from '@/components/marketplace/MarketplacePublicHeader'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import { BuddyAvatar } from '@/components/ui'
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
    <section className="relative flex min-h-screen flex-col overflow-hidden text-white">
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
        {/* Royal-blue overlay — photos stay vivid while matching the app shell. */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand-900/55 via-brand-700/20 to-night/70"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/70 to-transparent"
          aria-hidden
        />
      </div>

      {/* Island label — ties each photo to a destination */}
      {slide && (
        <div className="pointer-events-auto absolute bottom-6 left-4 z-10 hidden max-w-xs text-left sm:left-6 md:block">
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

      {/* Public marketplace nav */}
      <div className="relative z-20 w-full">
        <MarketplacePublicHeader activePath="/" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 items-center px-4 py-10 md:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="text-left">
            <div
              className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/35 bg-white/15 py-1.5 pl-1.5 pr-4 text-sm font-bold tracking-wide text-white shadow-soft backdrop-blur-md"
              style={{ textShadow: heroTextShadow }}
            >
              <BuddyAvatar size="sm" state="greeting" className="shrink-0 ring-2 ring-white/40" />
              <span>AI Bahamas travel companion</span>
            </div>

            <h1
              className="max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-tight md:text-6xl lg:text-[4.65rem]"
              style={{ textShadow: heroTextShadow }}
            >
              Plan, book, and travel the{' '}
              <span className="text-gold-300">Bahamas</span>{' '}
              with Buddy.
            </h1>

            <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-white/90" style={{ textShadow: heroTextShadow }}>
              Browse stays, compare live flights, explore islands, and turn the whole trip into one saved itinerary.
            </p>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ['Stays', 'Hotels, villas, homes', '/stays'],
                ['Flights', 'Live fares to the islands', '/flights'],
                ['Explore', 'Food, tours, beaches', '/explore'],
              ].map(([label, body, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="group rounded-2xl border border-white/25 bg-white/12 p-4 text-left backdrop-blur-md transition hover:border-white/45 hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                >
                  <span className="mb-3 block h-2 w-8 rounded-full bg-gold-400 transition group-hover:w-10" aria-hidden="true" />
                  <span className="block text-sm font-extrabold text-white">{label}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-white/75">{body}</span>
                </Link>
              ))}
            </div>

            <StoreBadgeLinks className="mt-8 justify-start" />
          </div>

          <div className="lg:justify-self-end">
            {/**
              MarketingHeroSearch is the direct-intent marketplace panel:
              Plan a Trip, Stays, Flights, and Things to Do. The homepage
              keeps Buddy as the planning hook while direct commerce paths
              stay visible above the fold.
            */}
            <MarketingHeroSearch />

            <div className="mt-4 rounded-2xl border border-white/25 bg-white/14 p-4 text-sm font-semibold leading-6 text-white/85 shadow-soft backdrop-blur-md">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              Need local review before you book?
              {' '}
              <Link href="/concierge-trip-plan" className="font-extrabold text-white underline decoration-gold-300 underline-offset-4 hover:text-gold-100">
                Get a Concierge Trip Plan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
