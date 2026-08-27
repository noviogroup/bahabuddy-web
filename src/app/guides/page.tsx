import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { fetchArticles } from '@/lib/sanity/queries'
import { ARTICLE_CATEGORY_LABEL } from '@/lib/sanity/types'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import { buddyChatHref } from '@/lib/buddy-chat'
import { editorialTripHref } from '@/lib/editorial-planning-links'

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

function formatReadTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return '5 min'
  return `${Math.round(minutes)} min`
}

export default async function GuidesPage() {
  const articles = await fetchArticles()

  return (
    <div className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Bahamas travel guides"
        title="Your island guidebook"
        subtitle="Expert tips on beaches, food, culture, and adventure — everything you need for the perfect Bahamas trip."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Guides' },
        ]}
        actions={(
          <>
            <Link href="/explore" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gold-400 align-middle" aria-hidden="true" />
              Explore islands
            </Link>
            <Link href={buddyChatHref('Help me choose a Bahamas guide')} className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night hover:border-gray-400 hover:bg-gray-50">
              Ask Buddy
            </Link>
          </>
        )}
      />

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
              const readTime = formatReadTime(article.readTimeMinutes)
              const guideHref = `/guides/${article.slug}`
              const startTripHref = editorialTripHref({
                returnTo: guideHref,
                source: 'guide',
                seed: `Use this Bahamas guide as planning context: ${article.title}. ${article.excerpt}`,
              })

              return (
                <article
                  key={article._id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Link href={guideHref} aria-label={`Read ${article.title}`}>
                    <ImageWithSourcePolicy
                      src={article.imageUrl}
                      alt={article.title}
                      title={article.title}
                      eyebrow={categoryLabel}
                      className="aspect-video"
                      imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                      tone="island"
                    >
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="rounded-full border border-gray-200 bg-white/95 px-3 py-1 text-xs font-semibold text-charcoal">
                          {categoryLabel}
                        </span>
                        <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
                          {readTime}
                        </span>
                      </div>
                    </ImageWithSourcePolicy>
                  </Link>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                      <Link href={guideHref} className="transition-colors hover:text-night">
                        {article.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
                      {article.excerpt}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        href={guideHref}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                      >
                        Read guide
                      </Link>
                      <Link
                        href={startTripHref}
                        className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
                      >
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                        Start trip
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-night">Want a personalized itinerary?</h2>
          <p className="mb-6 text-gray-600">
            Baha Buddy builds custom trip plans based on your interests, budget, and travel dates.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
            Get started free
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
