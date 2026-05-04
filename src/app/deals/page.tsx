import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'

export const metadata: Metadata = {
  title: 'Bahamas Deals & Packages | Baha Buddy',
  description: 'Browse current Bahamas hotel deals, tour packages, and island experiences. Find the best prices with Baha Buddy.',
  openGraph: {
    title: 'Bahamas Deals & Packages | Baha Buddy',
    description: 'Current deals on Bahamas hotels, tours, and island packages.',
  },
}

export const revalidate = 1800

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
  { id: '1', title: 'Nassau Beach Resort — Summer Escape', deal_type: 'accommodation', island: 'nassau', resort_name: 'British Colonial Hotel', description: 'Beachfront resort in the heart of Nassau with pools, watersports, and world-class dining.', price_from_usd: 189, price_unit: 'per_night', image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg', highlights: ['Beachfront', 'Pool', 'Watersports'], tags: ['Beach', 'Luxury'] },
  { id: '2', title: 'Exuma Swimming Pigs Day Tour', deal_type: 'tour', island: 'exuma', resort_name: null, description: 'Full-day boat tour to Big Major Cay to swim with the famous swimming pigs, plus snorkeling at pristine reefs.', price_from_usd: 149, price_unit: 'per_person', image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg', highlights: ['Swimming Pigs', 'Snorkeling', 'Boat Tour'], tags: ['Tour', 'Family', 'Adventure'] },
  { id: '3', title: '7-Night Island-Hopping Package', deal_type: 'package', island: null, resort_name: null, description: 'Visit Nassau, Exuma, and Eleuthera on this curated 7-night adventure through the best of the Bahamas. Flights and hotels included.', price_from_usd: 2299, price_unit: 'per_person', image_url: 'https://tempo.cdn.tambourine.com/windsong/media/cache/exumacaylands-5f5033a0c216a-1500x643.jpg', highlights: ['3 Islands', 'Flights Included', 'Hotels Included'], tags: ['Package', 'Adventure', 'Island-Hopping'] },
  { id: '4', title: 'Harbour Island Pink Sand Experience', deal_type: 'accommodation', island: 'harbour-island', resort_name: 'Pink Sands Resort', description: 'Stay steps from the world-famous pink sand beach. Golf cart rental included.', price_from_usd: 450, price_unit: 'per_night', image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg', highlights: ['Pink Sand Beach', 'Golf Cart', 'Boutique'], tags: ['Luxury', 'Romantic', 'Boutique'] },
  { id: '5', title: 'Abacos Sailing Charter', deal_type: 'activity', island: 'abacos', resort_name: null, description: 'Full-day private sailing charter through the Abacos Cays with a local captain. Includes snorkeling stop and lunch.', price_from_usd: 895, price_unit: 'per_charter', image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-the-abacos-islands-img-5f765543ac3d5.jpg', highlights: ['Private Charter', 'Lunch Included', 'Snorkeling'], tags: ['Sailing', 'Luxury', 'Adventure'] },
  { id: '6', title: 'Long Island Dive Package', deal_type: 'package', island: 'long-island', resort_name: null, description: 'Dive Dean\'s Blue Hole — the deepest known blue hole in the world. 3-night package with accommodation and 5 dives included.', price_from_usd: 799, price_unit: 'per_person', image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg', highlights: ['Dean\'s Blue Hole', '5 Dives', 'Accommodation'], tags: ['Diving', 'Adventure', 'Remote'] },
]

const DEAL_TYPES = ['All', 'accommodation', 'tour', 'package', 'activity']

const DEAL_TYPE_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  accommodation: { label: 'Hotel', color: 'bg-brand-50 text-brand-700 border border-brand-100', badge: 'bg-brand-600/80 text-white' },
  tour: { label: 'Tour', color: 'bg-brand-50 text-brand-700 border border-brand-100', badge: 'bg-brand-600/80 text-white' },
  package: { label: 'Package', color: 'bg-purple-50 text-purple-700 border border-purple-100', badge: 'bg-purple-600/80 text-white' },
  activity: { label: 'Activity', color: 'bg-gold-50 text-gold-700 border border-gold-100', badge: 'bg-gold-500/80 text-white' },
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
  return `From $${price.toLocaleString()}${unit ? (units[unit] ?? '') : ''}`
}

async function getDeals() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_deals')
      .select('id, title, deal_type, island, resort_name, description, price_from_usd, price_unit, image_url, highlights, tags')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return null
    return data as Deal[]
  } catch {
    return null
  }
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  const dbDeals = await getDeals()
  const allDeals = (dbDeals && dbDeals.length > 0) ? dbDeals : FALLBACK_DEALS

  const activeType = searchParams.type ?? 'All'

  const filtered = activeType === 'All'
    ? allDeals
    : allDeals.filter(d => d.deal_type === activeType)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-900">Baha Buddy</Link>
          <div className="flex items-center gap-4">
            <Link href="/destinations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">Destinations</Link>
            <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">Sign in</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-brand-200 text-sm font-semibold tracking-widest uppercase mb-3">Current Deals</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Bahamas Deals &amp; Packages</h1>
          <p className="text-brand-100 text-lg max-w-xl mx-auto">
            Curated stays, tours, and island packages — matched to your travel style.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Type filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DEAL_TYPES.map(type => {
            const config = type !== 'All' ? DEAL_TYPE_CONFIG[type] : null
            return (
              <Link
                key={type}
                href={`/deals?type=${type}`}
                className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                  activeType === type
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {config ? config.label : 'All Deals'}
              </Link>
            )
          })}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-400 mb-6">
          {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
          {activeType !== 'All' ? ` · ${DEAL_TYPE_CONFIG[activeType]?.label ?? activeType}` : ''}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🌴</div>
            <p className="text-lg font-medium text-gray-600">No deals found</p>
            <Link href="/deals" className="inline-block mt-4 text-brand-600 hover:text-brand-700 text-sm font-medium">
              Clear filters →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(deal => {
              const typeConfig = DEAL_TYPE_CONFIG[deal.deal_type] ?? { label: deal.deal_type, color: 'bg-gray-100 text-gray-600 border border-gray-200', badge: 'bg-gray-600/80 text-white' }

              return (
                <div
                  key={deal.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden bg-stone-200">
                    {deal.image_url ? (
                      <Image
                        src={deal.image_url}
                        alt={deal.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-200 to-brand-300 flex items-center justify-center">
                        <span className="text-5xl opacity-50">🌴</span>
                      </div>
                    )}
                    <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm ${typeConfig.badge}`}>
                      {typeConfig.label}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="text-base font-bold text-gray-900 leading-snug">{deal.title}</h2>
                    </div>

                    {deal.resort_name && (
                      <p className="text-xs text-gray-400 mb-2 font-medium">{deal.resort_name}</p>
                    )}

                    <p className="text-lg font-bold text-brand-700 mb-2">
                      {formatPrice(deal.price_from_usd, deal.price_unit)}
                    </p>

                    <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-3">
                      {deal.description}
                    </p>

                    {deal.highlights && deal.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {deal.highlights.slice(0, 3).map(h => (
                          <span key={h} className="text-xs bg-brand-50 text-brand-700 rounded-full px-3 py-0.5 font-medium">
                            ✓ {h}
                          </span>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/dashboard?q=${encodeURIComponent(`Tell me more about: ${deal.title}`)}`}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors text-center block"
                    >
                      Ask Baha Buddy →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* App CTA */}
        <div className="mt-16 bg-gradient-to-r from-brand-600 to-brand-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Get personalized deal recommendations</h2>
          <p className="text-brand-100 mb-6">Tell Baha Buddy your dates and budget — we&apos;ll find the best deals for you.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold rounded-xl px-6 py-3 hover:bg-brand-50 transition-colors text-sm"
            >
              🍎 Download on iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white font-semibold rounded-xl px-6 py-3 hover:bg-white/20 transition-colors text-sm"
            >
              🤖 Download on Android
            </a>
          </div>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
