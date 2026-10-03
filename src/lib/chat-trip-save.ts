/**
 * Helpers for the chat route's trip auto-save.
 *
 * Day-plan strings are model-authored free text, not database places, so they
 * are saved as clearly-labelled suggestions (activity_type 'suggestion', no
 * place_id) rather than as if they were grounded inventory items.
 */
import type { ParsedCard } from '@/lib/chat-utils'

export interface SummaryCardFields {
  card_type: 'summary'
  trip_name?: string
  days?: number
  islands?: string[]
  total_cost?: number
  travelers?: number
}

export const SUGGESTION_ACTIVITY_TYPE = 'suggestion'
export const SUGGESTION_NOTE = 'Buddy suggestion. Not linked to a verified listing yet.'

export function extractSummaryCard(cards: ParsedCard[]): SummaryCardFields | null {
  for (const card of cards) {
    if (card.card_type === 'summary') return card as unknown as SummaryCardFields
    if (card.card_type === 'mixed' && Array.isArray(card.cards)) {
      const nested = card.cards.find(c => c.card_type === 'summary')
      if (nested) return nested as unknown as SummaryCardFields
    }
  }
  return null
}

export function extractDayPlans(cards: ParsedCard[]): ParsedCard[] {
  return cards.flatMap(c => {
    if (c.card_type === 'day_plan') return [c]
    if (c.card_type === 'mixed' && Array.isArray(c.cards)) {
      return c.cards.filter(nc => nc.card_type === 'day_plan')
    }
    return []
  })
}

export interface SuggestionActivityRow {
  trip_id: string
  day_number: number
  time_slot: 'morning' | 'afternoon' | 'evening'
  activity_name: string
  activity_type: typeof SUGGESTION_ACTIVITY_TYPE
  place_id: null
  notes: string
  sort_order: number
}

const SLOTS = [
  ['morning', 0],
  ['afternoon', 1],
  ['evening', 2],
] as const

export function buildSuggestionActivityRows(tripId: string, cards: ParsedCard[]): SuggestionActivityRow[] {
  return extractDayPlans(cards).flatMap((dp, idx) => {
    const rawDay = Number(dp.day_number)
    const dayNumber = Number.isInteger(rawDay) && rawDay >= 1 && rawDay <= 60 ? rawDay : idx + 1
    return SLOTS.flatMap(([slot, order]) => {
      const value = dp[slot]
      if (typeof value !== 'string' || !value.trim()) return []
      return [{
        trip_id: tripId,
        day_number: dayNumber,
        time_slot: slot,
        activity_name: value.trim().slice(0, 200),
        activity_type: SUGGESTION_ACTIVITY_TYPE,
        place_id: null,
        notes: SUGGESTION_NOTE,
        sort_order: order,
      }]
    })
  })
}
