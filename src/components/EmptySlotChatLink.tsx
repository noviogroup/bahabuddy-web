'use client'

/**
 * EmptySlotChatLink — clickable dotted-outline placeholder for an empty
 * trip time slot. Clicking sends the user to /dashboard/chat?q=<prompt>
 * with the prompt pre-loaded so Buddy can suggest what to do.
 *
 * Used in the trip detail timeline view to surface empty slots (e.g.
 * Day 3 afternoon) as actionable prompts to extend the plan.
 *
 * Mobile reference: tapping an empty slot in my_trip_screen.dart opens
 * the chat with the same kind of pre-loaded prompt.
 *
 * Why a wrapper component:
 *   - <EmptySlot> is a pure UI primitive — it doesn't know about routing
 *   - The trip page is a server component — it can't useRouter
 *   - This client wrapper bridges the two
 */

import { useRouter } from 'next/navigation'
import { EmptySlot } from '@/components/ui'

interface EmptySlotChatLinkProps {
  /** The day number this slot belongs to, e.g. 3. */
  dayNumber: number
  /** Time slot: morning / afternoon / evening. */
  slot: 'morning' | 'afternoon' | 'evening'
  /** Trip name for the chat prompt context. */
  tripName: string
  /** Optional island context to mention in the prompt. */
  island?: string
}

export default function EmptySlotChatLink({
  dayNumber,
  slot,
  tripName,
  island,
}: EmptySlotChatLinkProps) {
  const router = useRouter()

  const prompt = buildPrompt({ dayNumber, slot, tripName, island })

  return (
    <EmptySlot
      size="sm"
      label={`Add to Day ${dayNumber} ${slot}`}
      hint="Tap to ask Buddy"
      onClick={() => router.push(`/dashboard/chat?q=${encodeURIComponent(prompt)}`)}
    />
  )
}

function buildPrompt({
  dayNumber,
  slot,
  tripName,
  island,
}: EmptySlotChatLinkProps): string {
  const where = island ? ` on ${island}` : ''
  return `For my "${tripName}" trip, suggest something good for Day ${dayNumber} ${slot}${where}.`
}
