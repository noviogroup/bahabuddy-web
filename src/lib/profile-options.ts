/**
 * profile-options.ts — shared constants for profile/onboarding forms.
 *
 * Mobile reference: lib/features/onboarding/data/onboarding_options.dart
 * The same slugs are used across mobile and web so user profile data
 * roundtrips cleanly between surfaces.
 */

export const PARTY_TYPES = [
  { value: 'solo',    label: 'Solo' },
  { value: 'couple',  label: 'Couple' },
  { value: 'family',  label: 'Family' },
  { value: 'friends', label: 'Friends / Group' },
] as const

export type PartyType = (typeof PARTY_TYPES)[number]['value']

/** Interest tag taxonomy — the 10 vibe categories from onboarding Screen 5. */
export const INTEREST_TAGS = [
  { slug: 'beach-chill',  label: 'Beach & Chill' },
  { slug: 'adventure',    label: 'Adventure & Outdoors' },
  { slug: 'culture',      label: 'Culture & History' },
  { slug: 'nightlife',    label: 'Nightlife & Parties' },
  { slug: 'romance',      label: 'Romance' },
  { slug: 'family',       label: 'Family Fun' },
  { slug: 'foodie',       label: 'Foodie & Dining' },
  { slug: 'water-sports', label: 'Water Sports & Diving' },
  { slug: 'luxury',       label: 'Luxury & Spa' },
  { slug: 'fishing',      label: 'Fishing & Boating' },
] as const

export type InterestSlug = (typeof INTEREST_TAGS)[number]['slug']
