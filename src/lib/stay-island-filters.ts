export type StayIslandFilter = {
  label: string
  aliases: string[]
}

export const STAY_ISLAND_FILTERS: StayIslandFilter[] = [
  {
    label: 'Nassau',
    aliases: ['nassau', 'new providence', 'nassau paradise island', 'nassau and paradise island'],
  },
  {
    label: 'Paradise Island',
    aliases: ['paradise island'],
  },
  {
    label: 'Exuma',
    aliases: ['exuma', 'exumas', 'the exumas', 'great exuma'],
  },
  {
    label: 'Eleuthera',
    aliases: ['eleuthera', 'eleuthera harbour island', 'eleuthera and harbour island'],
  },
  {
    label: 'Harbour Island',
    aliases: ['harbour island', 'harbor island', 'briland', 'dunmore town'],
  },
  {
    label: 'Abaco',
    aliases: ['abaco', 'abacos', 'the abacos'],
  },
  {
    label: 'Andros',
    aliases: ['andros'],
  },
  {
    label: 'Bimini',
    aliases: ['bimini'],
  },
  {
    label: 'Grand Bahama',
    aliases: ['grand bahama', 'freeport', 'freeport grand bahama island'],
  },
  {
    label: 'Long Island',
    aliases: ['long island'],
  },
]

function normalizeIslandToken(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCaseWords(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function matchingStayIslandFilter(value: string | null | undefined): StayIslandFilter | null {
  const normalized = normalizeIslandToken(value)
  if (!normalized) return null

  const exactLabel = STAY_ISLAND_FILTERS.find((filter) => (
    normalizeIslandToken(filter.label) === normalized
  ))
  if (exactLabel) return exactLabel

  const exactAlias = STAY_ISLAND_FILTERS.find((filter) => (
    filter.aliases.some((alias) => normalizeIslandToken(alias) === normalized)
  ))
  if (exactAlias) return exactAlias

  return STAY_ISLAND_FILTERS.find((filter) => (
    normalizeIslandToken(filter.label) !== normalized &&
    filter.aliases.some((alias) => {
      const normalizedAlias = normalizeIslandToken(alias)
      return normalizedAlias.length > 2 && normalized.includes(normalizedAlias)
    })
  )) ?? null
}

export function knownStayIslandFilterLabel(value: string | null | undefined): string {
  return matchingStayIslandFilter(value)?.label ?? ''
}

export function stayIslandFilterLabel(value: string | null | undefined): string {
  const match = matchingStayIslandFilter(value)
  if (match) return match.label

  const normalized = normalizeIslandToken(value)
  return normalized ? titleCaseWords(normalized) : ''
}

export function stayIslandFilterAliases(value: string | null | undefined): string[] {
  const match = matchingStayIslandFilter(value)
  const fallback = stayIslandFilterLabel(value)
  const aliases = match
    ? [match.label, ...match.aliases.map(titleCaseWords)]
    : [fallback]

  return Array.from(new Set(aliases.map((alias) => alias.trim()).filter(Boolean)))
}
