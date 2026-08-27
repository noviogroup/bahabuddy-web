'use client'

/**
 * EmptySlotChatLink — direct-action placeholder for an unplanned trip slot.
 *
 * Primary action browses real Explore inventory; Buddy is secondary for
 * narrowing choices. This keeps My Trip aligned with the marketplace rule:
 * direct user actions should not always route back into chat.
 */

import Link from 'next/link'
import { buddyChatHref } from '@/lib/buddy-chat'

type Slot = 'morning' | 'afternoon' | 'evening'

interface EmptySlotChatLinkProps {
  /** The trip this empty slot belongs to. Used to preselect direct save. */
  tripId: string
  /** The day number this slot belongs to, e.g. 3. */
  dayNumber: number
  /** Time slot: morning / afternoon / evening. */
  slot: Slot
  /** Trip name for the chat prompt context. */
  tripName: string
  /** Optional island context to mention in the prompt. */
  island?: string
}

export default function EmptySlotChatLink({
  tripId,
  dayNumber,
  slot,
  tripName,
  island,
}: EmptySlotChatLinkProps) {
  const prompt = buildPrompt({ dayNumber, slot, tripName, island })
  const exploreHref = buildExploreHref({ tripId, dayNumber, slot, island })
  const askBuddyHref = buddyChatHref(prompt)
  const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1)

  return (
    <div className="rounded-baha-md border-2 border-dashed border-brand-100 bg-brand-50/35 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-night">Add to Day {dayNumber} {slotLabel}</p>
          <p className="mt-0.5 text-xs leading-5 text-gray-500">Browse real places and experiences first, then ask Buddy if you want help choosing.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={exploreHref}
            className="rounded-full bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            Browse and add
          </Link>
          <Link
            href={askBuddyHref}
            className="rounded-full bg-white px-3.5 py-2 text-xs font-bold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            Ask Buddy
          </Link>
        </div>
      </div>
    </div>
  )
}

function buildPrompt({
  dayNumber,
  slot,
  tripName,
  island,
}: Omit<EmptySlotChatLinkProps, 'tripId'>): string {
  const where = island ? ` on ${island}` : ''
  return `For my "${tripName}" trip, suggest something good for Day ${dayNumber} ${slot}${where}.`
}

function buildExploreHref({
  tripId,
  dayNumber,
  slot,
  island,
}: {
  tripId: string
  dayNumber: number
  slot: Slot
  island?: string
}): string {
  const params = new URLSearchParams()
  if (island) params.set('island', island)
  params.set('tripId', tripId)
  params.set('dayNumber', String(Math.max(1, Math.trunc(dayNumber))))
  params.set('timeSlot', slot)
  if (slot === 'evening') params.set('category', 'food_culture')
  if (slot === 'morning' || slot === 'afternoon') params.set('category', 'tours')
  const query = params.toString()
  return query ? `/explore/places?${query}` : '/explore/places'
}
