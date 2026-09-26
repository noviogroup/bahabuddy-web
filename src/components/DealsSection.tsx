import Link from 'next/link'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { dealActionLinks, dealIslandLabel } from '@/lib/deal-actions'
import type { Deal } from '@/lib/deals'

const DEAL_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  accommodation: { label: 'Hotel', color: 'bg-brand-50 text-brand-700' },
  tour: { label: 'Tour', color: 'bg-brand-50 text-brand-700' },
  package: { label: 'Package', color: 'bg-purple-50 text-purple-700' },
  activity: { label: 'Activity', color: 'bg-gold-50 text-gold-700' },
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

        {deals.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <p className="font-bold text-night">Partner offers are being updated.</p>
            <p className="mt-2 text-sm text-gray-500">Ask Buddy to compare current stays and activities for your dates.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {deals.slice(0, 4).map((deal) => {
            const typeConfig = DEAL_TYPE_CONFIG[deal.deal_type] ?? {
              label: deal.deal_type,
              color: 'bg-gray-100 text-gray-600',
            }
            const action = dealActionLinks(deal)
            const islandLabel = dealIslandLabel(deal.island)

            return (
              <div
                key={deal.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col"
              >
                <ImageWithSourcePolicy
                  src={deal.image_url}
                  alt={deal.title}
                  title={deal.title}
                  eyebrow={typeConfig.label}
                  className="h-48"
                  imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  priority={false}
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
        )}

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
