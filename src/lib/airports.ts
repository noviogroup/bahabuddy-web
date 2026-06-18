export const CITY_TO_IATA: Record<string, string> = {
  miami: 'MIA',
  'fort lauderdale': 'FLL',
  'new york': 'JFK',
  jfk: 'JFK',
  newark: 'EWR',
  laguardia: 'LGA',
  atlanta: 'ATL',
  charlotte: 'CLT',
  dallas: 'DFW',
  houston: 'IAH',
  chicago: 'ORD',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  boston: 'BOS',
  philadelphia: 'PHL',
  washington: 'IAD',
  dc: 'IAD',
  orlando: 'MCO',
  tampa: 'TPA',
  detroit: 'DTW',
  denver: 'DEN',
  seattle: 'SEA',
  toronto: 'YYZ',
  london: 'LHR',
  nassau: 'NAS',
  freeport: 'FPO',
}

export function resolveAirportCode(input: string): string | null {
  if (!input) return null

  const clean = input.trim()
  if (/^[A-Z]{3}$/i.test(clean)) return clean.toUpperCase()

  const lower = clean.toLowerCase()
  if (CITY_TO_IATA[lower]) return CITY_TO_IATA[lower]

  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(city) || city.includes(lower)) return code
  }

  return null
}
