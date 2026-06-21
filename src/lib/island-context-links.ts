import { buddyChatHref } from '@/lib/buddy-chat'

export type IslandFoodLinks = {
  restaurantsHref: string
  foodCultureHref: string
  startTripHref: string
  askBuddyHref: string
  restaurantIsland: string
}

const ISLAND_FILTER_LABELS: Record<string, string> = {
  nassau: 'Nassau',
  'nassau-paradise-island': 'Nassau',
  'new-providence': 'Nassau',
  paradise: 'Paradise Island',
  'paradise-island': 'Paradise Island',
  exuma: 'Exuma',
  exumas: 'Exuma',
  'the-exumas': 'Exuma',
  eleuthera: 'Eleuthera',
  'eleuthera-harbour-island': 'Eleuthera',
  harbour: 'Harbour Island',
  'harbour-island': 'Harbour Island',
  briland: 'Harbour Island',
  abaco: 'Abacos',
  abacos: 'Abacos',
  'the-abacos': 'Abacos',
  andros: 'Andros',
  bimini: 'Bimini',
  'grand-bahama': 'Grand Bahama',
  'long-island': 'Long Island',
}

function cleanIslandKey(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function titleCaseWords(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function paramsFrom(values: Record<string, string>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value.trim()) params.set(key, value.trim())
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function islandRestaurantFilterLabel(value: string | null | undefined): string {
  const key = cleanIslandKey(value)
  if (!key) return ''
  if (ISLAND_FILTER_LABELS[key]) return ISLAND_FILTER_LABELS[key]
  return titleCaseWords(key)
}

export function islandFoodLinks({
  islandName,
  islandSlug,
  returnPath,
}: {
  islandName: string
  islandSlug: string
  returnPath: string
}): IslandFoodLinks {
  const restaurantIsland = islandRestaurantFilterLabel(islandName) || islandRestaurantFilterLabel(islandSlug)
  const exploreIsland = restaurantIsland || islandName
  const prompt = `Plan a food and culture day in ${islandName}`

  return {
    restaurantIsland,
    restaurantsHref: `/restaurants${paramsFrom({ island: restaurantIsland })}`,
    foodCultureHref: `/explore/places${paramsFrom({ island: exploreIsland, category: 'food_culture' })}`,
    startTripHref: `/dashboard/trips/new${paramsFrom({ returnTo: returnPath, source: 'destination' })}`,
    askBuddyHref: buddyChatHref(prompt),
  }
}
