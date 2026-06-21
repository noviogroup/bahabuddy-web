export type StayTravelerType = 'families' | 'couples' | 'groups' | 'work' | 'wellness'

export type StayTravelerTypeOption = {
  value: StayTravelerType
  label: string
  description: string
}

export const STAY_TRAVELER_TYPE_OPTIONS: StayTravelerTypeOption[] = [
  {
    value: 'families',
    label: 'Families',
    description: 'Pool, kitchen, parking, suites, or kid-friendly signals.',
  },
  {
    value: 'couples',
    label: 'Couples',
    description: 'Spa, boutique, romantic, beach, balcony, or premium signals.',
  },
  {
    value: 'groups',
    label: 'Groups',
    description: 'Villa, home, apartment, condo, kitchen, or laundry signals.',
  },
  {
    value: 'work',
    label: 'Work trips',
    description: 'Wifi, desk, business, meeting, airport, or parking signals.',
  },
  {
    value: 'wellness',
    label: 'Wellness',
    description: 'Spa, wellness, fitness, gym, yoga, beach, or pool signals.',
  },
]

const VALID_TRAVELER_TYPES = new Set<StayTravelerType>(
  STAY_TRAVELER_TYPE_OPTIONS.map((option) => option.value),
)

type TravelerFitHotel = {
  name?: string | null
  amenities?: string[] | null
  property_type_name?: string | null
  star_rating?: number | null
  review_score?: number | null
}

function normalizeSignal(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
}

function signalsForHotel(hotel: TravelerFitHotel): string[] {
  return [
    hotel.name,
    hotel.property_type_name,
    ...(hotel.amenities ?? []),
  ]
    .map(normalizeSignal)
    .filter(Boolean)
}

function signalIncludesAny(signals: string[], needles: string[]): boolean {
  return signals.some((signal) => needles.some((needle) => signal.includes(needle)))
}

export function parseStayTravelerType(value?: string | null): StayTravelerType | '' {
  const normalized = normalizeSignal(value).replaceAll(' ', '_')
  return VALID_TRAVELER_TYPES.has(normalized as StayTravelerType)
    ? normalized as StayTravelerType
    : ''
}

export function stayTravelerTypeLabel(value?: string | null): string {
  const parsed = parseStayTravelerType(value)
  return STAY_TRAVELER_TYPE_OPTIONS.find((option) => option.value === parsed)?.label ?? ''
}

export function hotelMatchesTravelerType(
  hotel: TravelerFitHotel,
  travelerType?: StayTravelerType | '',
): boolean {
  if (!travelerType) return true

  const signals = signalsForHotel(hotel)
  const starRating = hotel.star_rating ?? 0
  const reviewScore = hotel.review_score ?? 0

  switch (travelerType) {
    case 'families':
      return signalIncludesAny(signals, [
        'family',
        'kid',
        'children',
        'pool',
        'kitchen',
        'suite',
        'parking',
        'laundry',
        'breakfast',
      ])
    case 'couples':
      return signalIncludesAny(signals, [
        'couple',
        'romantic',
        'spa',
        'boutique',
        'balcony',
        'beach',
        'ocean',
        'private',
      ]) || (starRating >= 4 && reviewScore >= 8.5)
    case 'groups':
      return signalIncludesAny(signals, [
        'villa',
        'home',
        'house',
        'apartment',
        'condo',
        'kitchen',
        'laundry',
        'suite',
      ])
    case 'work':
      return signalIncludesAny(signals, [
        'wifi',
        'wi fi',
        'business',
        'desk',
        'meeting',
        'conference',
        'airport',
        'parking',
      ])
    case 'wellness':
      return signalIncludesAny(signals, [
        'spa',
        'wellness',
        'fitness',
        'gym',
        'yoga',
        'massage',
        'pool',
        'beach',
      ])
    default:
      return true
  }
}
