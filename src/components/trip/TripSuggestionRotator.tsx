'use client'

/**
 * TripSuggestionRotator — rotating Buddy-voice suggestion cards on
 * the trip detail page. Mirrors MindTrip's "1 of 3 / 2 of 3 / 3 of 3"
 * suggestion strip but with Buddy's tone and Bahamas-specific prompts.
 *
 * Three slides per trip state, chosen by the trip's status + content:
 *
 *   draft / no plans yet     → opening prompts (where to begin, things to do)
 *   draft / some plans       → continuation prompts (book, refine)
 *   planned / booked         → on-trip prompts (weather, pack, money)
 *
 * Each slide has:
 *   - A Buddy-voiced question (e.g. "Let's get you set for Andros…")
 *   - 3 quick-reply chips that deep-link to /dashboard/chat?trip=<id>&q=<prompt>
 *
 * Imagery: subtle island texture watermark in the corner (a real
 * Bahamas photo at 8% opacity) — gives the card warmth without
 * competing with text. The Buddy avatar sits top-left for personality.
 *
 * Mount it on the trip detail page above the 6-action tile grid.
 */

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BuddyAvatar } from '@/components/ui'
import { BahaImages, type BahaImageKey } from '@/lib/baha-images'
import type { Trip } from '@/types/database'

interface TripSuggestionRotatorProps {
  trip: Trip
  hasItinerary: boolean
}

interface Slide {
  question: string
  chips: { label: string; prompt: string }[]
}

/** Maps a trip's primary island display name to a BahaImages key for
 *  the corner watermark. Falls back to `bahamasLifestyle` so something
 *  always renders. */
function islandImageKey(islandName: string | undefined): BahaImageKey {
  if (!islandName) return 'bahamasLifestyle'
  const normalized = islandName.toLowerCase()
  if (normalized.includes('exuma')) return 'exumas'
  if (normalized.includes('paradise')) return 'paradiseIsland'
  if (normalized.includes('nassau')) return 'nassau'
  if (normalized.includes('harbour')) return 'harbourIsland'
  if (normalized.includes('eleuthera')) return 'eleuthera'
  if (normalized.includes('andros')) return 'andros'
  if (normalized.includes('grand bahama')) return 'grandBahama'
  if (normalized.includes('bimini')) return 'bimini'
  if (normalized.includes('long')) return 'longIsland'
  if (normalized.includes('abaco')) return 'abacos'
  return 'bahamasLifestyle'
}

/** Build the three slides for the rotator based on trip state. */
function buildSlides(trip: Trip, hasItinerary: boolean): Slide[] {
  const island = trip.islands?.[0] ?? 'the Bahamas'
  const status = (trip.status ?? 'draft').toLowerCase()
  const days = trip.date_start && trip.date_end
    ? Math.max(1, Math.ceil(
        (new Date(trip.date_end).getTime() - new Date(trip.date_start).getTime()) / 86_400_000,
      ) + 1)
    : null
  const daysWord = days ? numberToWord(days) : null

  // State 1: fresh / no itinerary content yet.
  if (!hasItinerary && (status === 'draft' || status === 'planned')) {
    return [
      {
        question: `Let's get you set for ${island}. Where would you like to begin?`,
        chips: [
          { label: 'Check weather', prompt: `What's the weather like in ${island} during my trip?` },
          { label: 'Help me pack', prompt: `What should I pack for ${island}?` },
          { label: 'Payments & cash', prompt: `Do I need cash in the Bahamas, or are cards fine in ${island}?` },
        ],
      },
      {
        question: `${island} should be a great escape. Want help getting your first few plans in place?`,
        chips: [
          { label: 'Things to do', prompt: `What are the best things to do in ${island}?` },
          { label: 'Hidden gems', prompt: `What are some hidden gems in ${island} most tourists miss?` },
          { label: 'Plan first days', prompt: `Help me plan the first 2 days of my trip to ${island}.` },
        ],
      },
      {
        question: daysWord
          ? `${capitalize(daysWord)} days on ${island} gives you room to settle in. Should we sort out where to stay next?`
          : `Want me to help sort out where to stay in ${island}?`,
        chips: [
          { label: 'Find places to stay', prompt: `Show me good hotels in ${island}.` },
          { label: 'Best areas', prompt: `What are the best areas to stay in ${island}?` },
          { label: 'Stay by the beach', prompt: `Find me a beachfront hotel in ${island}.` },
        ],
      },
    ]
  }

  // State 2: planned trips with some itinerary content.
  if (status === 'planned' || status === 'draft') {
    return [
      {
        question: `Your ${island} plan is shaping up. Anything you want to fine-tune?`,
        chips: [
          { label: 'Swap a hotel', prompt: `Show me alternative hotels in ${island}.` },
          { label: 'Add activities', prompt: `What activities should I add to my trip?` },
          { label: 'Tighten the schedule', prompt: `Review my itinerary and suggest improvements.` },
        ],
      },
      {
        question: `Want me to dig into flights or transportation around ${island}?`,
        chips: [
          { label: 'Find flights', prompt: `Help me find flights to ${island}.` },
          { label: 'Getting around', prompt: `How do I get around ${island}?` },
          { label: 'Ferry options', prompt: `Are there ferries to ${island}?` },
        ],
      },
      {
        question: `Ready to lock things in, or want one more look at the budget?`,
        chips: [
          { label: 'Review budget', prompt: `Walk me through what this trip will cost.` },
          { label: 'Save on activities', prompt: `What activities are best value in ${island}?` },
          { label: 'Book this trip', prompt: `I want to book this trip — what do I need to confirm?` },
        ],
      },
    ]
  }

  // State 3: booked / active / completed trips — on-trip helpers.
  return [
    {
      question: `${island} is on the calendar. What can I help you prep?`,
      chips: [
        { label: 'Check weather', prompt: `What's the weather forecast for ${island} during my trip?` },
        { label: 'Help me pack', prompt: `Build me a packing list for ${island}.` },
        { label: 'Travel checklist', prompt: `What do I need to take care of before leaving for the Bahamas?` },
      ],
    },
    {
      question: `Want a few standout ideas for things to do once you're there?`,
      chips: [
        { label: 'Day trips', prompt: `What are the best day trips from ${island}?` },
        { label: 'Dinner picks', prompt: `Where should I eat dinner in ${island}?` },
        { label: 'Beach picks', prompt: `What are the best beaches in ${island}?` },
      ],
    },
    {
      question: `Anything practical you want pinned down — money, getting around, customs?`,
      chips: [
        { label: 'Payments & cash', prompt: `Do I need cash in the Bahamas, or are cards fine?` },
        { label: 'Tipping', prompt: `How does tipping work in the Bahamas?` },
        { label: 'Local etiquette', prompt: `Any cultural tips I should know for ${island}?` },
      ],
    },
  ]
}

function numberToWord(n: number): string {
  if (n < 0 || n > 30) return n.toString()
  const ones = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  if (n < 20) return ones[n]
  const tens = ['','','twenty','thirty']
  const t = Math.floor(n / 10)
  const r = n % 10
  return r === 0 ? tens[t] : `${tens[t]}-${ones[r]}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Build the chat deep-link URL with trip + seed query. */
function buildChatHref(tripId: string, prompt: string): string {
  const params = new URLSearchParams()
  params.set('trip', tripId)
  params.set('q', prompt)
  return `/dashboard/chat?${params.toString()}`
}

export default function TripSuggestionRotator({ trip, hasItinerary }: TripSuggestionRotatorProps) {
  const slides = useMemo(() => buildSlides(trip, hasItinerary), [trip, hasItinerary])
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  const primaryIsland = trip.islands?.[0]
  const watermarkKey = islandImageKey(primaryIsland)

  const canPrev = index > 0
  const canNext = index < slides.length - 1

  return (
    <section
      aria-label="Suggested next steps"
      className="relative rounded-baha-lg bg-white border border-gray-200 shadow-card overflow-hidden"
    >
      {/* Imagery watermark — real island photo at low opacity, decorative only */}
      <div className="absolute -top-6 -right-6 w-44 h-44 opacity-[0.08] pointer-events-none" aria-hidden="true">
        <Image
          src={BahaImages[watermarkKey]}
          alt=""
          fill
          sizes="200px"
          className="object-cover rounded-full"
        />
      </div>

      <div className="relative p-5 sm:p-6">
        {/* Top row — Buddy avatar + pagination indicator + arrows */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <BuddyAvatar size="sm" state="idle" />
            <span className="text-xs font-semibold text-gray-500">
              {index + 1} of {slides.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => canPrev && setIndex(i => i - 1)}
              disabled={!canPrev}
              aria-label="Previous suggestion"
              className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:text-night hover:border-night disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:border-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => canNext && setIndex(i => i + 1)}
              disabled={!canNext}
              aria-label="Next suggestion"
              className="w-8 h-8 rounded-full border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Buddy's question */}
        <h2 className="text-lg sm:text-xl font-bold text-night leading-snug max-w-2xl">
          {slide.question}
        </h2>

        {/* Quick-reply chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {slide.chips.map((chip) => (
            <Link
              key={chip.label}
              href={buildChatHref(trip.id, chip.prompt)}
              className="inline-flex items-center bg-white hover:bg-night hover:text-white text-night text-sm font-semibold px-4 py-2 rounded-full border border-gray-200 hover:border-night transition-colors shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
