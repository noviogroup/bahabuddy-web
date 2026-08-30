export const DEFAULT_STAY_TYPE_OPTIONS = [
  'Hotel',
  'Resort',
  'Villa',
  'Home',
  'House',
  'Apartment',
  'Condo',
] as const

export const LITEAPI_STAY_PROPERTY_TYPE_NAMES: Record<number, string> = {
  0: 'Not Available',
  201: 'Apartments',
  203: 'Hostels',
  204: 'Hotels',
  205: 'Motels',
  206: 'Resorts',
  207: 'Residences',
  208: 'Bed and breakfasts',
  209: 'Ryokans',
  210: 'Farm stays',
  212: 'Holiday parks',
  213: 'Villas',
  214: 'Campsites',
  215: 'Boats',
  216: 'Guest houses',
  218: 'Inns',
  219: 'Aparthotels',
  220: 'Holiday homes',
  221: 'Lodges',
  222: 'Homestays',
  223: 'Country houses',
  224: 'Luxury tents',
  225: 'Capsule hotels',
  226: 'Love hotels',
  227: 'Riads',
  228: 'Chalets',
  229: 'Condos',
  230: 'Cottages',
  231: 'Economy hotels',
  232: 'Gites',
  233: 'Health resorts',
  234: 'Cruises',
  235: 'Student accommodation',
  243: 'Tree house property',
  247: 'Pension',
  250: 'Private vacation home',
  251: 'Pousada',
  252: 'Country house',
  254: 'Campsite',
  257: 'Cabin',
  258: 'Holiday park',
  262: 'Affittacamere',
  264: 'Hostel/Backpacker accommodation',
  265: 'Houseboat',
  268: 'Ranch',
  271: 'Agritourism property',
  272: 'Mobile home',
  273: 'Safari/Tentalow',
  274: 'All-inclusive property',
  276: 'Castle',
  277: 'Property',
  278: 'Palace',
}

const STAY_PROPERTY_TYPE_ID_GROUPS: Record<string, number[]> = {
  hotel: [204, 205, 218, 225, 231, 247],
  resort: [206, 233, 274],
  villa: [213],
  home: [220, 222, 250],
  house: [216, 221, 223, 230, 252, 257],
  apartment: [201, 207, 219],
  condo: [229],
}

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
    case 'motel':
    case 'motels':
    case 'inn':
    case 'inns':
    case 'pension':
    case 'economy hotel':
    case 'economy hotels':
      return ['Hotel', 'Hotels', 'Boutique Hotel', 'Motel', 'Motels', 'Inn', 'Inns', 'Pension', 'Economy hotels']
    case 'resort':
    case 'resorts':
    case 'health resort':
    case 'health resorts':
    case 'all inclusive':
    case 'all inclusive property':
      return ['Resort', 'Resorts', 'Health resorts', 'All-inclusive property']
    case 'villa':
    case 'villas':
      return ['Villa', 'Villas']
    case 'home':
    case 'homes':
    case 'vacation home':
    case 'vacation homes':
    case 'vacation rental':
    case 'vacation rentals':
    case 'private home':
    case 'private homes':
    case 'holiday home':
    case 'holiday homes':
    case 'homestay':
    case 'homestays':
    case 'private vacation home':
      return [
        'Home',
        'Homes',
        'Vacation Home',
        'Vacation Homes',
        'Vacation Rental',
        'Vacation Rentals',
        'Private Home',
        'Private Homes',
        'Holiday home',
        'Holiday homes',
        'Homestay',
        'Homestays',
        'Private vacation home',
      ]
    case 'house':
    case 'houses':
    case 'guest house':
    case 'guest houses':
    case 'guesthouse':
    case 'guesthouses':
    case 'country house':
    case 'country houses':
    case 'cottage':
    case 'cottages':
    case 'lodge':
    case 'lodges':
    case 'cabin':
    case 'cabins':
      return ['House', 'Houses', 'Guest House', 'Guesthouse', 'Guest houses', 'Guesthouses', 'Country house', 'Country houses', 'Cottage', 'Cottages', 'Lodge', 'Lodges', 'Cabin']
    case 'apartment':
    case 'apartments':
    case 'aparthotel':
    case 'aparthotels':
    case 'residence':
    case 'residences':
      return ['Apartment', 'Apartments', 'Aparthotel', 'Aparthotels', 'Residence', 'Residences']
    case 'condo':
    case 'condos':
    case 'condominium':
    case 'condominiums':
      return ['Condo', 'Condos', 'Condominium', 'Condominiums']
    default:
      return value && value.trim() ? [value.trim()] : []
  }
}

export function stayPropertyTypeIds(value?: string | null): number[] {
  const normalized = normalizeStayPropertyType(value)
  if (!normalized) return []

  const canonical = (() => {
    if (['hotel', 'hotels', 'boutique hotel', 'boutique hotels', 'motel', 'motels', 'inn', 'inns', 'pension', 'economy hotel', 'economy hotels'].includes(normalized)) return 'hotel'
    if (['resort', 'resorts', 'health resort', 'health resorts', 'all inclusive', 'all inclusive property'].includes(normalized)) return 'resort'
    if (['villa', 'villas'].includes(normalized)) return 'villa'
    if (['home', 'homes', 'holiday home', 'holiday homes', 'vacation home', 'vacation homes', 'vacation rental', 'vacation rentals', 'private home', 'private homes', 'private vacation home', 'homestay', 'homestays'].includes(normalized)) return 'home'
    if (['house', 'houses', 'guest house', 'guest houses', 'guesthouse', 'guesthouses', 'country house', 'country houses', 'cottage', 'cottages', 'lodge', 'lodges', 'cabin', 'cabins'].includes(normalized)) return 'house'
    if (['apartment', 'apartments', 'aparthotel', 'aparthotels', 'residence', 'residences'].includes(normalized)) return 'apartment'
    if (['condo', 'condos', 'condominium', 'condominiums'].includes(normalized)) return 'condo'
    return null
  })()

  if (canonical) return STAY_PROPERTY_TYPE_ID_GROUPS[canonical] ?? []

  return Object.entries(LITEAPI_STAY_PROPERTY_TYPE_NAMES)
    .filter(([, typeName]) => normalizeStayPropertyType(typeName) === normalized)
    .map(([id]) => Number(id))
}

export function stayPropertyTypeNameFromId(propertyTypeId?: number | null): string | null {
  if (propertyTypeId == null) return null
  return LITEAPI_STAY_PROPERTY_TYPE_NAMES[propertyTypeId] ?? null
}

export function resolveStayPropertyTypeName(
  propertyTypeName?: string | null,
  propertyTypeId?: number | null,
): string | null {
  const trimmed = propertyTypeName?.trim()
  return trimmed || stayPropertyTypeNameFromId(propertyTypeId)
}

export function stayPropertyTypesMatch(
  actualType?: string | null,
  wantedType?: string | null,
  actualTypeId?: number | null,
): boolean {
  const actualAliases = stayPropertyTypeAliases(resolveStayPropertyTypeName(actualType, actualTypeId))
    .map(normalizeStayPropertyType)
  const wantedAliases = stayPropertyTypeAliases(wantedType)
    .map(normalizeStayPropertyType)
  const wantedIds = stayPropertyTypeIds(wantedType)

  return wantedAliases.some((wanted) => actualAliases.includes(wanted))
    || (actualTypeId != null && wantedIds.includes(actualTypeId))
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
