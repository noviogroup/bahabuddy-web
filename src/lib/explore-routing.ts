const VIBE_LABELS: Record<string, string> = {
  beach: 'Beach',
  adventure: 'Adventure',
  family: 'Family',
  foodie: 'Food',
  water: 'Water sports',
  romance: 'Romantic',
}

const VIBE_CATEGORIES: Record<string, string> = {
  beach: 'Beach',
  adventure: 'Activity',
  family: 'Activity',
  foodie: 'Dining',
  water: 'Water Activity',
  romance: 'Activity',
}

export function buildExplorePlacesHref(input: {
  islandSlug?: string
  vibes?: Iterable<string>
  search?: string
}) {
  const params = new URLSearchParams()
  const islandSlug = input.islandSlug?.trim()
  const explicitSearch = input.search?.trim()
  const vibeKeys = Array.from(input.vibes ?? []).filter(Boolean)

  if (islandSlug) params.set('island', islandSlug)

  const categories = Array.from(new Set(
    vibeKeys.map((key) => VIBE_CATEGORIES[key]).filter((value): value is string => Boolean(value)),
  ))
  if (categories.length === 1) params.set('category', categories[0])

  const searchTerms = explicitSearch || vibeKeys
    .map((key) => VIBE_LABELS[key] ?? key)
    .join(' ')
    .trim()
  if (searchTerms) params.set('search', searchTerms)

  const qs = params.toString()
  return qs ? `/explore/places?${qs}` : '/explore/places'
}
