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
    image_url: null,
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
    image_url: null,
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
    image_url: null,
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
    image_url: null,
    highlights: ['Pink Sand Beach', 'Golf Cart', 'Boutique'],
    tags: ['Luxury', 'Romantic', 'Boutique'],
  },
]

const DEAL_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  accommodation: { label: 'Hotel', color: 'bg-blue-100 text-blue-700', icon: '🏨' },
  tour: { label: 'Tour', color: 'bg-teal-100 text-teal-700', icon: '⛵' },
  package: { label: 'Package', color: 'bg-purple-100 text-purple-700', icon: '✈️' },
  activity: { label: 'Activity', color: 'bg-amber-100 text-amber-700', icon: '🤿' },
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

const GRADIENT_COLORS = [
  'from-blue-400 to-cyan-400',
  'from-teal-400 to-emerald-400',
  'from-sky-400 to-blue-500',
  'from-cyan-400 to-teal-500',
]

interface Props {
  deals: Deal[]
}

export default function DealsSection({ deals }: Props) {
  const items = deals.length > 0 ? deals : FALLBACK_DEALS

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <span>💰</span>
            <span>Current Deals</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bahamas Packages & Deals
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Curated stays, tours, and packages across the Bahamas. The Baha Buddy app surfaces
            the best deals matched to your travel dates and budget.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {items.slice(0, 4).map((deal, index) => {
            const typeConfig = DEAL_TYPE_CONFIG[deal.deal_type] ?? {
              label: deal.deal_type,
              color: 'bg-gray-100 text-gray-600',
              icon: '🌴',
            }
            const gradientClass = GRADIENT_COLORS[index % GRADIENT_COLORS.length]

            return (
              <div
                key={deal.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col"
              >
                {/* Image / gradient placeholder */}
                <div className={`relative h-40 bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden`}>
                  {deal.image_url ? (
                    <img
                      src={deal.image_url}
                      alt={deal.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-5xl opacity-60">{typeConfig.icon}</span>
                  )}

                  <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-2.5 py-1 ${typeConfig.color}`}>
                    {typeConfig.label}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{deal.title}</h3>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-blue-700">
                        {formatPrice(deal.price_from_usd, deal.price_unit)}
                      </div>
                    </div>
                  </div>

                  {deal.resort_name && (
                    <p className="text-xs text-gray-400 mb-2">{deal.resort_name}</p>
                  )}

                  <p className="text-sm text-gray-500 leading-relaxed mb-3 flex-1">
                    {deal.description}
                  </p>

                  {deal.highlights && deal.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {deal.highlights.slice(0, 3).map((h) => (
                        <span
                          key={h}
                          className="text-xs bg-blue-50 text-blue-600 rounded-full px-2.5 py-0.5"
                        >
                          ✓ {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-600 mb-4 font-medium">
            Get personalized deal recommendations in the app
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl px-6 py-3 font-medium transition-colors"
            >
              <span>🍎</span> Get the iOS App
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl px-6 py-3 font-medium transition-colors"
            >
              <span>🤖</span> Get the Android App
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
