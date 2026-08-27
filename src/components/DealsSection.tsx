import Link from 'next/link'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { BahaImages } from '@/lib/baha-images'
import { dealActionLinks, dealIslandLabel } from '@/lib/deal-actions'

interface Deal {
  id: string
  title: string
  deal_type: string
  island: string | null
  resort_name: string | null
  description: string
  price_from_usd: number | null
  price_unit: string | null
  image_url: string | null
  highlights: string[]
  tags: string[]
  valid_through?: string | null
}

const FALLBACK_DEALS: Deal[] = [
  {
    id: '1',
    title: 'Nassau Beach Resort — Summer Escape',
    deal_type: 'accommodation',
    island: 'nassau',
    resort_name: 'British Colonial Hotel',
    description: 'Beachfront resort in the heart of Nassau with pools, watersports, and world-class dining.',
    price_from_usd: 189,
    price_unit: 'per_night',
    image_url: BahaImages.nassau,
    highlights: ['Beachfront', 'Pool', 'Watersports'],
    tags: ['Beach', 'Luxury'],
  },
  {
    id: '2',
    title: 'Exuma Swimming Pigs Day Tour',
    deal_type: 'tour',
    island: 'exuma',
    resort_name: null,
    description: 'Full-day boat tour to Big Major Cay to swim with the famous swimming pigs, plus snorkeling.',
    price_from_usd: 149,
    price_unit: 'per_person',
    image_url: BahaImages.exumas,
    highlights: ['Swimming Pigs', 'Snorkeling', 'Boat Tour'],
    tags: ['Tour', 'Family', 'Adventure'],
  },
  {
    id: '3',
    title: '7-Night Island-Hopping Package',
    deal_type: 'package',
    island: null,
    resort_name: null,
    description: 'Visit Nassau, Exuma, and Eleuthera on this curated 7-night adventure through the best of the Bahamas.',
    price_from_usd: 2299,
    price_unit: 'per_person',
    image_url: BahaImages.snorkeling,
    highlights: ['3 Islands', 'Flights Included', 'Hotels Included'],
    tags: ['Package', 'Adventure', 'Island-Hopping'],
  },
  {
    id: '4',
    title: 'Harbour Island Pink Sand Experience',
    deal_type: 'accommodation',
    island: 'harbour-island',
    resort_name: 'Pink Sands Resort',
    description: 'Stay steps from the world-famous pink sand beach on Harbour Island. Golf cart included.',
    price_from_usd: 450,
    price_unit: 'per_night',
    image_url: BahaImages.eleuthera,
    highlights: ['Pink Sand Beach', 'Golf Cart', 'Boutique'],
    tags: ['Luxury', 'Romantic', 'Boutique'],
  },
]

const DEAL_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  accommodation: { label: 'Hotel', color: 'bg-brand-50 text-brand-700' },
  tour: { label: 'Tour', color: 'bg-brand-50 text-brand-700' },
  package: { label: 'Package', color: 'bg-purple-50 text-purple-700' },
  activity: { label: 'Activity', color: 'bg-gold-50 text-gold-700' },
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function dealImageUrl(deal: Deal): string {
  if (deal.image_url) return deal.image_url

  const text = [
    deal.title,
    deal.deal_type,
    deal.island,
    deal.resort_name,
    deal.description,
    ...(deal.highlights ?? []),
    ...(deal.tags ?? []),
  ].map(normalizeToken).join(' ')

  if (text.includes('exuma') || text.includes('pig')) return BahaImages.exumas
  if (text.includes('eleuthera') || text.includes('harbour island') || text.includes('pink sand')) return BahaImages.eleuthera
  if (text.includes('abaco')) return BahaImages.abacos
  if (text.includes('andros')) return BahaImages.andros
  if (text.includes('bimini')) return BahaImages.bimini
  if (text.includes('grand bahama') || text.includes('freeport')) return BahaImages.grandBahama
  if (text.includes('long island')) return BahaImages.longIsland
  if (text.includes('snorkel') || text.includes('boat') || text.includes('water')) return BahaImages.snorkeling
  if (text.includes('sailing')) return BahaImages.sunsetSailing
  if (text.includes('beach')) return BahaImages.beach
  if (text.includes('junkanoo') || text.includes('culture')) return BahaImages.junkanoo

  return BahaImages.nassau
}

function formatPrice(price: number | null, unit: string | null): string {
  if (!price) return 'Contact for price'
  const units: Record<string, string> = {
    per_night: '/night',
    per_person: '/person',
    per_day: '/day',
    per_charter: '/charter',
    total: ' total',
  }
  const unitLabel = unit ? (units[unit] ?? '') : ''
  return `From $${price.toLocaleString()}${unitLabel}`
}

interface Props {
  deals: Deal[]
}

export default function DealsSection({ deals }: Props) {
  const usingFallbackDeals = deals.length === 0
  const items = usingFallbackDeals ? FALLBACK_DEALS : deals

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-brand-600 text-sm font-semiboldst uppercase mb-3">
            Current Deals
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bahamas Packages &amp; Deals
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Curated stays, tours, and packages across the islands. Baha Buddy surfaces the
            best deals matched to your dates and budget.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {items.slice(0, 4).map((deal) => {
            const typeConfig = DEAL_TYPE_CONFIG[deal.deal_type] ?? {
              label: deal.deal_type,
              color: 'bg-gray-100 text-gray-600',
            }
            const imageUrl = usingFallbackDeals ? dealImageUrl(deal) : deal.image_url
            const action = dealActionLinks(deal)
            const islandLabel = dealIslandLabel(deal.island)

            return (
              <div
                key={deal.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col"
              >
                <ImageWithSourcePolicy
                  src={imageUrl}
                  alt={deal.title}
                  title={deal.title}
                  eyebrow={typeConfig.label}
                  className="h-48"
                  imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  priority={usingFallbackDeals}
                  tone="deal"
                >
                  <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm ${typeConfig.color}`}>
                    {typeConfig.label}
                  </div>
                </ImageWithSourcePolicy>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{deal.title}</h3>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-brand-700 whitespace-nowrap">
                        {formatPrice(deal.price_from_usd, deal.price_unit)}
                      </div>
                    </div>
                  </div>

                  {deal.resort_name && (
                    <p className="text-xs text-gray-400 mb-2 font-medium">{deal.resort_name}</p>
                  )}

                  <p className="mb-2 text-xs font-bold uppercase text-brand-700">
                    {islandLabel || action.contextLabel}
                  </p>

                  <p className="text-sm text-gray-500 leading-relaxed mb-3 flex-1">
                    {deal.description}
                  </p>

                  {deal.highlights && deal.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {deal.highlights.slice(0, 3).map((h) => (
                        <span
                          key={h}
                          className="text-xs bg-brand-50 text-brand-700 rounded-full px-3 py-0.5 font-medium"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-auto">
                    {deal.valid_through && (
                      <span className="text-xs text-gray-400">
                        Expires {new Date(deal.valid_through).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                    <div className="ml-auto flex flex-wrap justify-end gap-2">
                      <Link
                        href={action.primaryHref}
                        className="text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                      >
                        {action.primaryLabel}
                      </Link>
                      <Link
                        href={action.secondaryHref}
                        className="text-xs font-bold border border-brand-200 bg-white text-brand-700 hover:bg-brand-50 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                      >
                        Ask Buddy
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 mb-5 text-sm">
            Get personalized deal recommendations in the app
          </p>
          <StoreBadgeLinks height={44} />
        </div>
      </div>
    </section>
  )
}
