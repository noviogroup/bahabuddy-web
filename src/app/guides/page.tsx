import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { BahaLogo } from '@/components/ui'
import Footer from '@/components/Footer'
import { fetchArticles } from '@/lib/sanity/queries'
import { ARTICLE_CATEGORY_LABEL } from '@/lib/sanity/types'

/**
 * /guides — Marketing-side list of editorial guides.
 *
 * Public-discoverable (outside `(dashboard)/`), SEO-valuable. Pulls
 * `article` documents from the canonical Sanity Studio at
 * `/Baha Buddy/studio/`. When Studio has no published content the
 * page renders the "Guides coming soon" empty state.
 *
 * History:
 *   - Pre-Session 13: queried the placeholder `discoverArticle`
 *     document type.
 *   - Session 13: aligned to the canonical Studio `article` schema.
 *     Studio's machine-value category (`travel_guide`,
 *     `food_dining`, …) resolves through `ARTICLE_CATEGORY_LABEL` to
 *     a display label. `readTimeMinutes` (number) is formatted to a
 *     "7 min" string at render time.
 *
 * Caching: 1-hour revalidation (`revalidate = 3600`). Marketing
 * content doesn't change as fast as the dashboard's Discover surface.
 */

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Bahamas Travel Guides — Baha Buddy',
  description:
    'In-depth guides to the Bahamas — beaches, adventure, food, culture, and more. Plan your perfect island escape with expert travel tips.',
  openGraph: {
    title: 'Bahamas Travel Guides | Baha Buddy',
    description: 'In-depth guides to the Bahamas — beaches, adventure, food, culture, and more.',
  },
}

/**
 * Category-color map. Keyed by the display label (post-translation
 * through ARTICLE_CATEGORY_LABEL). Falls back to a neutral gray when
 * an editor adds a category that hasn't been styled yet.
 */
const CATEGORY_COLORS: Record<string, string> = {
  'Travel Guide':      'bg-sky-100      text-sky-700',
  'Island Deep-Dive':  'bg-blue-100     text-blue-700',
  'Food & Dining':     'bg-rose-100     text-rose-700',
  'Adventure':         'bg-emerald-100  text-emerald-700',
  'Culture':           'bg-indigo-100   text-indigo-700',
  'Insider Tips':      'bg-amber-100    text-amber-700',
}

function formatReadTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return '5 min'
  return `${Math.round(minutes)} min`
}

export default async function GuidesPage() {
  const articles = await fetchArticles()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" />
          <nav className="flex items-center gap-4">
            <Link href="/destinations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Destinations
            </Link>
            <Link href="/deals" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Deals
            </Link>
            <Link href="/guides" className="text-sm font-medium text-brand-600 hidden sm:block">
              Guides
            </Link>
            <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-brand-100 text-sm font-semibold tracking-widest uppercase mb-3">
            Bahamas Travel Guides
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Your Island Guidebook
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Expert tips on beaches, food, culture, and adventure — everything you need for the
            perfect Bahamas trip.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {!articles || articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">Guides coming soon</p>
            <p className="text-sm mt-1">
              We&apos;re working on in-depth Bahamas guides. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => {
              const categoryLabel = ARTICLE_CATEGORY_LABEL[article.category] ?? article.category
              const catColor = CATEGORY_COLORS[categoryLabel] ?? 'bg-gray-100 text-gray-700'
              const readTime = formatReadTime(article.readTimeMinutes)
              return (
                <Link
                  key={article._id}
                  href={`/guides/${article.slug}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100"
                >
                  <div className="relative aspect-video overflow-hidden bg-stone-200">
                    {article.imageUrl ? (
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-200 to-brand-300 flex items-center justify-center">
                        <span className="text-6xl opacity-50" aria-hidden="true">📖</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={`text-xs font-semibold rounded-full px-3 py-1 ${catColor}`}>
                        {categoryLabel}
                      </span>
                      <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
                        {readTime}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
                      {article.excerpt}
                    </p>
                    <div className="mt-4 text-sm font-medium text-brand-600">
                      Read guide &rarr;
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Want a personalized itinerary?</h2>
          <p className="text-brand-100 mb-6">
            Baha Buddy builds custom trip plans based on your interests, budget, and travel dates.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold rounded-xl px-6 py-3 hover:bg-brand-50 transition-colors text-sm"
          >
            Get Started Free &rarr;
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
