export const DEFAULT_STAY_TYPE_OPTIONS = [
  'Hotel',
  'Resort',
  'Villa',
  'Home',
  'House',
  'Apartment',
  'Condo',
] as const

export function normalizeStayPropertyType(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replaceAll('&', 'and')
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
    .replaceAll(/\s+/g, ' ')
}

export function stayPropertyTypeAliases(value?: string | null): string[] {
  switch (normalizeStayPropertyType(value)) {
    case 'hotel':
    case 'hotels':
    case 'boutique hotel':
    case 'boutique hotels':
    case 'resort':
    case 'resorts':
    case 'inn':
    case 'inns':
      return ['Hotel', 'Boutique Hotel', 'Resort', 'Inn']
    case 'villa':
    case 'villas':
      return ['Villa', 'Villas']
    case 'home':
    case 'homes':
    case 'house':
    case 'houses':
    case 'guest house':
    case 'guest houses':
    case 'guesthouse':
    case 'guesthouses':
    case 'vacation home':
    case 'vacation homes':
    case 'vacation rental':
    case 'vacation rentals':
    case 'private home':
    case 'private homes':
      return [
        'Home',
        'House',
        'Guest House',
        'Guesthouse',
        'Vacation Home',
        'Vacation Rental',
        'Private Home',
      ]
    case 'apartment':
    case 'apartments':
    case 'aparthotel':
    case 'aparthotels':
    case 'condo':
    case 'condos':
    case 'condominium':
    case 'condominiums':
      return ['Apartment', 'Apartments', 'Aparthotel', 'Condo', 'Condominium']
    default:
      return value && value.trim() ? [value.trim()] : []
  }
}

export function stayPropertyTypesMatch(
  actualType?: string | null,
  wantedType?: string | null,
): boolean {
  const actualAliases = stayPropertyTypeAliases(actualType)
    .map(normalizeStayPropertyType)
  const wantedAliases = stayPropertyTypeAliases(wantedType)
    .map(normalizeStayPropertyType)
  return wantedAliases.some((wanted) => actualAliases.includes(wanted))
}

export function getStayTypeFilterOptions(catalogTypes: string[]): string[] {
  const seen = new Set<string>()
  return [...catalogTypes, ...DEFAULT_STAY_TYPE_OPTIONS]
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeStayPropertyType(value)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
