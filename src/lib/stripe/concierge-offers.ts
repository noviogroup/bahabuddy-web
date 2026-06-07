export type ConciergeOfferId =
  | 'quick_review'
  | 'concierge_trip_plan'
  | 'full_planning_support'

export interface ConciergeOffer {
  name: string
  amountCents: number
  description: string
  priceUsd: number
}

export const CONCIERGE_PRODUCT = 'concierge_trip_plan'

export const CONCIERGE_OFFERS: Record<ConciergeOfferId, ConciergeOffer> = {
  quick_review: {
    name: 'Baha Buddy Quick Review',
    amountCents: 4900,
    priceUsd: 49,
    description: 'Local review and refinement of an AI-generated Bahamas itinerary.',
  },
  concierge_trip_plan: {
    name: 'Baha Buddy Concierge Trip Plan',
    amountCents: 14900,
    priceUsd: 149,
    description:
      'Human-reviewed 3-5 day Bahamas itinerary with island, hotel, dining, activity, budget, and document guidance.',
  },
  full_planning_support: {
    name: 'Baha Buddy Full Planning Support',
    amountCents: 29900,
    priceUsd: 299,
    description:
      'Concierge itinerary planning plus booking assistance handoff and priority follow-up.',
  },
}

export function isConciergeOfferId(value: string): value is ConciergeOfferId {
  return value in CONCIERGE_OFFERS
}

export function getConciergeOffer(offerId: string): ConciergeOffer | null {
  if (!isConciergeOfferId(offerId)) return null
  return CONCIERGE_OFFERS[offerId]
}
