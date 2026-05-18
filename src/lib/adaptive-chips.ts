/**
 * Adaptive suggestion chips — pick chip set based on the last assistant message.
 *
 * Mobile reference: _shouldShowChips() in lib/features/chat/screens/chat_screen.dart
 *
 * The mobile app fades suggestion chips after the user becomes comfortable
 * (engagement_score). For web parity we use a simpler rule: chips are
 * always present (they help discovery on a wide canvas), but the SET of
 * chips adapts to what Buddy just showed.
 *
 * Logic:
 *   - Last assistant has hotel cards     → "Cheaper options" / "Different island" / "Closer to beach"
 *   - Last assistant has restaurant cards → "Different cuisine" / "Family-friendly" / "Top-rated"
 *   - Last assistant has flight cards     → "Earlier flight" / "Different date" / "Direct only"
 *   - Last assistant has summary card     → "Love it!" / "Cheaper options" / "Add activities" (gold)
 *   - Last assistant has activity cards   → "More activities" / "Different vibe" / "Kid-friendly"
 *   - Last assistant has day_plan cards   → "Add another day" / "Swap morning" / "Different pace"
 *   - Last assistant has destination cards → "Tell me more" / "Plan this" / "Compare islands"
 *   - Else (general text)                 → "Show me flights" / "Where to stay?" / "Surprise me" (gold)
 */

import type { ParsedCard } from './chat-utils'

export type ChipVariant = 'default' | 'gold'

export interface Chip {
  label: string
  prompt: string
  variant?: ChipVariant
}

/** Default chip set when no assistant context exists yet. */
const DEFAULT_CHIPS: Chip[] = [
  { label: 'Show me flights',     prompt: 'Show me flights to the Bahamas' },
  { label: 'Where to stay?',      prompt: 'Where should I stay in the Bahamas?' },
  { label: 'Surprise me',         prompt: 'Surprise me with a trip idea', variant: 'gold' },
]

/** Find the most specific card_type in the last assistant message. */
function dominantCardType(cards?: ParsedCard[]): string | null {
  if (!cards || cards.length === 0) return null

  // Priority order: summary trumps day_plan trumps everything else,
  // because if Buddy returned a summary the conversation is at a decision point.
  const priority = ['summary', 'day_plan', 'flight', 'hotel', 'activity', 'restaurant', 'destination', 'map']

  const types = new Set<string>()
  for (const card of cards) {
    if (card.card_type === 'mixed' && Array.isArray(card.cards)) {
      for (const nested of card.cards) types.add(nested.card_type)
    } else if (card.card_type) {
      types.add(card.card_type)
    }
  }

  for (const p of priority) {
    if (types.has(p)) return p
  }
  return null
}

export function getAdaptiveChips(lastAssistantCards?: ParsedCard[]): Chip[] {
  const dominant = dominantCardType(lastAssistantCards)

  switch (dominant) {
    case 'summary':
      return [
        { label: 'Love it!',          prompt: 'Love it — let\'s book it',          variant: 'gold' },
        { label: 'Cheaper options',   prompt: 'Show me cheaper options' },
        { label: 'Add activities',    prompt: 'Add some more activities to this trip' },
      ]

    case 'day_plan':
      return [
        { label: 'Add another day',   prompt: 'Add another day to this itinerary' },
        { label: 'Swap morning',      prompt: 'Swap the morning activity for something else' },
        { label: 'Different pace',    prompt: 'Make the pace more relaxed' },
      ]

    case 'flight':
      return [
        { label: 'Earlier flight',    prompt: 'Show me an earlier flight' },
        { label: 'Different date',    prompt: 'Try different travel dates' },
        { label: 'Direct only',       prompt: 'Show me direct flights only' },
      ]

    case 'hotel':
      return [
        { label: 'Cheaper options',   prompt: 'Show me cheaper hotel options' },
        { label: 'Different island',  prompt: 'Try hotels on a different island' },
        { label: 'Closer to beach',   prompt: 'Show me hotels closer to the beach' },
      ]

    case 'activity':
      return [
        { label: 'More activities',   prompt: 'Show me more activities' },
        { label: 'Different vibe',    prompt: 'Try a different vibe of activity' },
        { label: 'Kid-friendly',      prompt: 'Make these more kid-friendly' },
      ]

    case 'restaurant':
      return [
        { label: 'Different cuisine', prompt: 'Show me a different cuisine' },
        { label: 'Family-friendly',   prompt: 'Show me family-friendly restaurants' },
        { label: 'Top-rated',         prompt: 'Show me the top-rated spots only' },
      ]

    case 'destination':
      return [
        { label: 'Tell me more',      prompt: 'Tell me more about this destination' },
        { label: 'Plan this',         prompt: 'Help me plan a trip here',           variant: 'gold' },
        { label: 'Compare islands',   prompt: 'Compare this with another island' },
      ]

    case 'map':
      return [
        { label: 'Get directions',    prompt: 'How do I get there?' },
        { label: 'Nearby spots',      prompt: 'What\'s nearby?' },
        { label: 'Plan this',         prompt: 'Help me plan a visit here',          variant: 'gold' },
      ]

    default:
      return DEFAULT_CHIPS
  }
}
