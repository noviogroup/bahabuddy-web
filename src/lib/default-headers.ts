import { BahaImages } from '@/lib/baha-images'
import { createClient } from '@/lib/supabase/server'

export type DefaultHeaderType = 'global' | 'island' | 'itinerary_category' | 'business_type' | 'empty_state'
export type HeaderVariant = 'desktop' | 'mobile' | 'card' | 'appDetail'

export interface DefaultHeaderImage {
  id?: string
  title: string
  description?: string | null
  header_type: DefaultHeaderType
  scope_key: string
  island?: string | null
  category?: string | null
  business_type?: string | null
  desktop_image_url: string
  mobile_image_url?: string | null
  card_image_url?: string | null
  app_detail_image_url?: string | null
  alt_text: string
  is_active: boolean
  sort_order: number
}

export interface ResolvedHeaderImage {
  url: string
  alt: string
  source: 'custom' | 'category' | 'island' | 'business_type' | 'global' | 'static'
  record?: DefaultHeaderImage
}

export function slugifyHeaderScope(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const globalHeader: DefaultHeaderImage = {
  title: 'Global Bahamas Coastline',
  header_type: 'global',
  scope_key: 'global',
  desktop_image_url: BahaImages.nassau,
  alt_text: 'Bright Bahamas coastline with turquoise water and soft blue sky',
  is_active: true,
  sort_order: 1,
}

export const STATIC_DEFAULT_HEADERS: DefaultHeaderImage[] = [
  globalHeader,
  { title: 'Nassau Header', header_type: 'island', scope_key: 'nassau', island: 'Nassau', desktop_image_url: BahaImages.nassau, alt_text: 'Nassau waterfront and tropical city coastline', is_active: true, sort_order: 10 },
  { title: 'Paradise Island Header', header_type: 'island', scope_key: 'paradise-island', island: 'Paradise Island', desktop_image_url: BahaImages.paradiseIsland, alt_text: 'Paradise Island resort coastline and turquoise water', is_active: true, sort_order: 11 },
  { title: 'Exuma Header', header_type: 'island', scope_key: 'exuma', island: 'Exuma', desktop_image_url: BahaImages.exumas, alt_text: 'Exuma sandbar and clear shallow blue water', is_active: true, sort_order: 12 },
  { title: 'Exumas Header', header_type: 'island', scope_key: 'exumas', island: 'Exumas', desktop_image_url: BahaImages.exumas, alt_text: 'Exumas sandbar and clear shallow blue water', is_active: true, sort_order: 12 },
  { title: 'Eleuthera Header', header_type: 'island', scope_key: 'eleuthera', island: 'Eleuthera', desktop_image_url: BahaImages.eleuthera, alt_text: 'Eleuthera pink sand beach and clear water', is_active: true, sort_order: 13 },
  { title: 'Harbour Island Header', header_type: 'island', scope_key: 'harbour-island', island: 'Harbour Island', desktop_image_url: BahaImages.harbourIsland, alt_text: 'Harbour Island pink sand beach and pastel coastal charm', is_active: true, sort_order: 13 },
  { title: 'Abaco Header', header_type: 'island', scope_key: 'abaco', island: 'Abaco', desktop_image_url: BahaImages.abacos, alt_text: 'Abaco marina and island-hopping coastline', is_active: true, sort_order: 14 },
  { title: 'Abacos Header', header_type: 'island', scope_key: 'abacos', island: 'Abacos', desktop_image_url: BahaImages.abacos, alt_text: 'Abacos marina and island-hopping coastline', is_active: true, sort_order: 14 },
  { title: 'Andros Header', header_type: 'island', scope_key: 'andros', island: 'Andros', desktop_image_url: BahaImages.andros, alt_text: 'Andros blue hole and natural green coastline', is_active: true, sort_order: 15 },
  { title: 'Bimini Header', header_type: 'island', scope_key: 'bimini', island: 'Bimini', desktop_image_url: BahaImages.bimini, alt_text: 'Bimini beach and boating water scene', is_active: true, sort_order: 16 },
  { title: 'Grand Bahama Header', header_type: 'island', scope_key: 'grand-bahama', island: 'Grand Bahama', desktop_image_url: BahaImages.grandBahama, alt_text: 'Grand Bahama beach and tropical coastline', is_active: true, sort_order: 17 },
  { title: 'Long Island Header', header_type: 'island', scope_key: 'long-island', island: 'Long Island', desktop_image_url: BahaImages.longIsland, alt_text: 'Long Island cliffs and dramatic blue coastline', is_active: true, sort_order: 18 },
  { title: 'Cruise Day Header', header_type: 'itinerary_category', scope_key: 'cruise-day', category: 'Cruise Day', desktop_image_url: BahaImages.nassau, alt_text: 'Cruise day in Nassau with port and waterfront energy', is_active: true, sort_order: 30 },
  { title: 'Family Day Header', header_type: 'itinerary_category', scope_key: 'family-day', category: 'Family Day', desktop_image_url: BahaImages.beach, alt_text: 'Family beach day with calm water and white sand', is_active: true, sort_order: 31 },
  { title: 'Adventure Header', header_type: 'itinerary_category', scope_key: 'adventure', category: 'Adventure', desktop_image_url: BahaImages.snorkeling, alt_text: 'Adventure activity in clear turquoise Bahamas water', is_active: true, sort_order: 32 },
  { title: 'Food & Culture Header', header_type: 'itinerary_category', scope_key: 'food-culture', category: 'Food & Culture', desktop_image_url: BahaImages.bahamasLifestyle, alt_text: 'Bahamian food and colorful cultural island setting', is_active: true, sort_order: 33 },
  { title: 'Luxury Header', header_type: 'itinerary_category', scope_key: 'luxury', category: 'Luxury', desktop_image_url: BahaImages.nassau, alt_text: 'Luxury Bahamas resort beach and premium coastal setting', is_active: true, sort_order: 34 },
  { title: 'Budget Friendly Header', header_type: 'itinerary_category', scope_key: 'budget-friendly', category: 'Budget Friendly', desktop_image_url: BahaImages.beach, alt_text: 'Accessible Bahamas public beach and local day out', is_active: true, sort_order: 35 },
  { title: 'Rainy Day Header', header_type: 'itinerary_category', scope_key: 'rainy-day', category: 'Rainy Day', desktop_image_url: BahaImages.junkanoo, alt_text: 'Indoor Bahamas cultural experience for a rainy day', is_active: true, sort_order: 36 },
  { title: 'Nightlife Header', header_type: 'itinerary_category', scope_key: 'nightlife', category: 'Nightlife', desktop_image_url: BahaImages.sunsetSailing, alt_text: 'Bahamas nightlife with music and warm evening lights', is_active: true, sort_order: 37 },
  { title: 'Romantic Header', header_type: 'itinerary_category', scope_key: 'romantic', category: 'Romantic', desktop_image_url: BahaImages.sunsetSailing, alt_text: 'Romantic Bahamas sunset beach and dining setting', is_active: true, sort_order: 38 },
  { title: 'Local Gems Header', header_type: 'itinerary_category', scope_key: 'local-gems', category: 'Local Gems', desktop_image_url: BahaImages.eleuthera, alt_text: 'Hidden Bahamas beach and local gem coastline', is_active: true, sort_order: 39 },
  { title: 'Restaurant Header', header_type: 'business_type', scope_key: 'restaurant', business_type: 'Restaurant', desktop_image_url: BahaImages.bahamasLifestyle, alt_text: 'Bahamian food table with seafood and tropical drinks', is_active: true, sort_order: 50 },
  { title: 'Tour Operator Header', header_type: 'business_type', scope_key: 'tour-operator', business_type: 'Tour Operator', desktop_image_url: BahaImages.exumas, alt_text: 'Bahamas boat tour on clear water', is_active: true, sort_order: 51 },
  { title: 'Hotel Header', header_type: 'business_type', scope_key: 'hotel', business_type: 'Hotel', desktop_image_url: BahaImages.nassau, alt_text: 'Bahamas hotel resort with beach and pool atmosphere', is_active: true, sort_order: 52 },
  { title: 'Beach Header', header_type: 'business_type', scope_key: 'beach', business_type: 'Beach', desktop_image_url: BahaImages.beach, alt_text: 'Wide Bahamas beach with clear turquoise water', is_active: true, sort_order: 53 },
  { title: 'Shopping Header', header_type: 'business_type', scope_key: 'shopping', business_type: 'Shopping', desktop_image_url: BahaImages.bahamasLifestyle, alt_text: 'Bahamian shopping and local artisan market details', is_active: true, sort_order: 54 },
  { title: 'Transportation Header', header_type: 'business_type', scope_key: 'transportation', business_type: 'Transportation', desktop_image_url: BahaImages.nassau, alt_text: 'Bahamas transportation and airport transfer service', is_active: true, sort_order: 55 },
  { title: 'Business Nightlife Header', header_type: 'business_type', scope_key: 'nightlife', business_type: 'Nightlife', desktop_image_url: BahaImages.sunsetSailing, alt_text: 'Bahamian nightlife venue with music and warm lighting', is_active: true, sort_order: 56 },
  { title: 'Attractions Header', header_type: 'business_type', scope_key: 'attractions', business_type: 'Attractions', desktop_image_url: BahaImages.junkanoo, alt_text: 'Bahamas historic attraction and coastal sightseeing', is_active: true, sort_order: 57 },
]

function imageUrlForVariant(record: DefaultHeaderImage, variant: HeaderVariant) {
  if (variant === 'mobile') return record.mobile_image_url || record.desktop_image_url
  if (variant === 'card') return record.card_image_url || record.desktop_image_url
  if (variant === 'appDetail') return record.app_detail_image_url || record.desktop_image_url
  return record.desktop_image_url
}

async function getDbDefaultHeaders(): Promise<DefaultHeaderImage[] | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('default_header_images')
      .select('id,title,description,header_type,scope_key,island,category,business_type,desktop_image_url,mobile_image_url,card_image_url,app_detail_image_url,alt_text,is_active,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) return null
    return data as DefaultHeaderImage[]
  } catch {
    return null
  }
}

export async function getDefaultHeaders() {
  return (await getDbDefaultHeaders()) || STATIC_DEFAULT_HEADERS
}

export function resolveStaticDefaultHeaderImage({
  customImageUrl,
  category,
  island,
  businessType,
  preferredVariant = 'desktop',
}: {
  customImageUrl?: string | null
  category?: string | null
  island?: string | null
  businessType?: string | null
  preferredVariant?: HeaderVariant
}): ResolvedHeaderImage {
  if (customImageUrl) return { url: customImageUrl, alt: 'Baha Buddy page header image', source: 'custom' }
  return resolveFromCatalog(STATIC_DEFAULT_HEADERS, { category, island, businessType, preferredVariant })
}

export async function resolveDefaultHeaderImage({
  customImageUrl,
  category,
  island,
  businessType,
  preferredVariant = 'desktop',
}: {
  customImageUrl?: string | null
  category?: string | null
  island?: string | null
  businessType?: string | null
  preferredVariant?: HeaderVariant
}): Promise<ResolvedHeaderImage> {
  if (customImageUrl) return { url: customImageUrl, alt: 'Baha Buddy page header image', source: 'custom' }
  const catalog = await getDefaultHeaders()
  return resolveFromCatalog(catalog, { category, island, businessType, preferredVariant })
}

function resolveFromCatalog(catalog: DefaultHeaderImage[], {
  category,
  island,
  businessType,
  preferredVariant,
}: {
  category?: string | null
  island?: string | null
  businessType?: string | null
  preferredVariant: HeaderVariant
}): ResolvedHeaderImage {
  const categoryKey = slugifyHeaderScope(category)
  const islandKey = slugifyHeaderScope(island)
  const businessKey = slugifyHeaderScope(businessType)

  const categoryRecord = categoryKey ? catalog.find(item => item.header_type === 'itinerary_category' && item.scope_key === categoryKey) : undefined
  if (categoryRecord) return { url: imageUrlForVariant(categoryRecord, preferredVariant), alt: categoryRecord.alt_text, source: 'category', record: categoryRecord }

  const businessRecord = businessKey ? catalog.find(item => item.header_type === 'business_type' && item.scope_key === businessKey) : undefined
  if (businessRecord) return { url: imageUrlForVariant(businessRecord, preferredVariant), alt: businessRecord.alt_text, source: 'business_type', record: businessRecord }

  const islandRecord = islandKey ? catalog.find(item => item.header_type === 'island' && item.scope_key === islandKey) : undefined
  if (islandRecord) return { url: imageUrlForVariant(islandRecord, preferredVariant), alt: islandRecord.alt_text, source: 'island', record: islandRecord }

  const globalRecord = catalog.find(item => item.header_type === 'global') || globalHeader
  return { url: imageUrlForVariant(globalRecord, preferredVariant), alt: globalRecord.alt_text, source: 'global', record: globalRecord }
}
