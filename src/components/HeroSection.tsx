'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const HERO_IMAGE = 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg'

const QUICK_CHIPS = [
  { emoji: '🐷', label: 'Swimming Pigs (Exuma)', prompt: 'Plan a trip to see the swimming pigs in Exuma' },
  { emoji: '🤿', label: 'Snorkeling in Nassau', prompt: 'Best snorkeling spots in Nassau Bahamas' },
  { emoji: '⛵', label: 'Exuma Cays day trip', prompt: 'Plan an Exuma Cays day trip itinerary' },
  { emoji: '🌙', label: 'Nassau nightlife', prompt: 'Best nightlife spots in Nassau Bahamas' },
  { emoji: '👨‍👩‍👧', label: 'Family beach holiday', prompt: 'Plan a family beach vacation in the Bahamas' },
  { emoji: '💑', label: 'Romantic Harbour Island', prompt: 'Romantic things to do in Harbour Island Bahamas' },
  { emoji: '🏖️', label: 'Seven Mile Beach, Andros', prompt: 'Plan a visit to Seven Mile Beach in Andros Bahamas' },
  { emoji: '🦞', label: 'Local seafood tour', prompt: 'Best local seafood restaurants and food tours in the Bahamas' },
]

export default function HeroSection() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/dashboard?q=${encodeURIComponent(query.trim())}`)
  }

  const handleChip = (prompt: string) => {
    setQuery(prompt)
  }

  return (
    <section className="relative overflow-hidden min-h-screen flex flex-col text-white">
      {/* Full-bleed background photo */}
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt="Nassau, Bahamas — turquoise waters and white sand beaches"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70" />
      </div>

      {/* Nav */}
      <div className="relative flex items-center justify-between max-w-6xl mx-auto px-6 pt-6 w-full">
        <span className="text-xl font-bold tracking-tight">Baha Buddy</span>
        <Link
          href="/login"
          className="text-sm text-white/80 hover:text-white transition-colors border border-white/25 rounded-full px-4 py-1.5"
        >
          Sign in
        </Link>
      </div>

      {/* Hero content — centered */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-sm font-medium mb-8 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 inline-block" />
          Your AI Bahamas Travel Companion
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.05] mb-5 max-w-3xl">
          Where in the{' '}
          <span className="text-gold-300">Bahamas</span>{' '}
          do you want to go?
        </h1>

        <p className="text-lg text-white/70 mb-10 max-w-lg leading-relaxed">
          Tell Baha Buddy what you&apos;re dreaming of — we&apos;ll build your perfect island itinerary.
        </p>

        {/* Chat input */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-5">
          <div className="flex gap-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-2 shadow-2xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about islands, beaches, hotels, activities..."
              className="flex-1 bg-transparent text-white placeholder-white/50 px-4 py-3 text-base outline-none min-w-0"
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

        {/* Quick reply chips */}
        <div className="w-full max-w-3xl overflow-x-auto pb-1 -mx-4 px-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChip(chip.prompt)}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-sm border border-white/20 text-white text-sm rounded-full px-4 py-2 transition-all shadow-sm whitespace-nowrap"
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Secondary app CTAs */}
        <div className="flex flex-wrap gap-3 justify-center mt-10">
          <a
            href="https://apps.apple.com/app/baha-buddy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-xl px-5 py-2.5 transition-colors text-sm font-medium"
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
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-xl px-5 py-2.5 transition-colors text-sm font-medium"
            aria-label="Get on Google Play"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.18 23.76c.36.19.77.21 1.16.06l12.24-7.07-2.65-2.65-10.75 9.66zM.94 1.05C.36 1.52 0 2.28 0 3.26v17.47c0 .98.36 1.74.95 2.22l.12.1 9.77-9.77v-.23L1.06.95.94 1.05zM22.41 10.3l-2.79-1.61-2.99 2.99 2.99 2.99 2.81-1.62c.8-.46.8-1.21-.02-1.75zM4.34.18L16.58 7.25l-2.65 2.65L3.18.24A1.32 1.32 0 014.34.18z" />
            </svg>
            Google Play
          </a>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="relative border-t border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '700+', label: 'Islands & Cays' },
              { value: 'AI', label: 'Smart Itineraries' },
              { value: 'Free', label: 'To Download' },
              { value: '24/7', label: 'Travel Assistant' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-bold text-gold-300">{stat.value}</div>
                <div className="text-xs text-white/60 mt-0.5 tracking-wide uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
