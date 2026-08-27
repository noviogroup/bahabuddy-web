import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import PortableTextBody from '@/components/PortableTextBody'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { fetchArticleBySlug, fetchAllArticleSlugs } from '@/lib/sanity/queries'
import { ARTICLE_CATEGORY_LABEL } from '@/lib/sanity/types'
import { editorialBuddyHref, editorialTripHref } from '@/lib/editorial-planning-links'

/**
 * /guides/[slug] — Marketing-side article reader.
 *
 * Sanity-only (no hardcoded fallback) because this is the public
 * marketing surface. If no article exists with the slug, we render
 * the 404 page. The dashboard equivalent at
 * `/explore/articles/[slug]` keeps a hardcoded fallback so the
 * authenticated experience still has content even before Studio is
 * populated.
 *
 * History:
 *   - Pre-Session 13: queried the placeholder `discoverArticle` type
 *     with `fetchDiscoverArticleBySlug`. Read `article.body`,
 *     `article.buddyPrompt`, `article.readTime` (string).
 *   - Session 13: aligned to the canonical Studio `article` schema.
 *     `readTime` (string) → `readTimeMinutes` (number) formatted at
 *     render. Studio doesn't have a dedicated `buddyPrompt` field —
 *     derived from the title at render time.
 *
 * Caching: 1-hour revalidation matches the index page.
 */

export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await fetchAllArticleSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const article = await fetchArticleBySlug(params.slug)
  if (!article) return { title: 'Guide Not Found | Baha Buddy' }
  return {
    title: `${article.title} — Bahamas Travel Guide`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: article.imageUrl ? [{ url: article.imageUrl }] : undefined,
    },
  }
}

function formatReadTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return '5 min'
  return `${Math.round(minutes)} min`
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const article = await fetchArticleBySlug(params.slug)
  if (!article) notFound()

  const categoryLabel = ARTICLE_CATEGORY_LABEL[article.category] ?? article.category
  const readTime = formatReadTime(article.readTimeMinutes)
  // Studio doesn't have a dedicated buddyPrompt field — synthesize one
  // from the title. Future Studio extension: add a string field if
  // editors want hand-tuned prompts.
  const buddyPrompt = `Tell me more about ${article.title}`
  const startTripHref = editorialTripHref({
    returnTo: `/guides/${params.slug}`,
    source: 'guide',
    seed: `Use this Bahamas guide as planning context: ${article.title}. ${article.excerpt}`,
  })
  const buddyHref = editorialBuddyHref(buddyPrompt)
  const publishedLabel = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow={categoryLabel}
        title={article.title}
        subtitle={article.excerpt}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/guides', label: 'Guides' },
          { label: categoryLabel },
        ]}
        actions={(
          <>
            <Link
              href={startTripHref}
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gold-400 align-middle" aria-hidden="true" />
              Start trip from guide
            </Link>
            <Link
              href={buddyHref}
              className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Ask Buddy
            </Link>
          </>
        )}
      >
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-charcoal ring-1 ring-gray-200">
            {categoryLabel}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-charcoal ring-1 ring-gray-200">
            {readTime} read
          </span>
          {publishedLabel && (
            <time className="rounded-full bg-white px-3 py-1 text-xs font-bold text-charcoal ring-1 ring-gray-200">
              {publishedLabel}
            </time>
          )}
        </div>
      </CompactPageHeader>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <ImageWithSourcePolicy
          src={article.imageUrl}
          alt={article.title}
          title={article.title}
          eyebrow={categoryLabel}
          className="mb-8 aspect-[16/7] min-h-[220px] rounded-baha-xl border border-gray-200 shadow-sm"
          imageClassName="object-cover"
          sizes="(max-width: 768px) 100vw, 896px"
          priority
          tone="island"
        />

        <article className="mx-auto max-w-3xl">
          {/* Body */}
          {article.body && article.body.length > 0 ? (
            <div className="prose-container">
              <PortableTextBody body={article.body} />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Full article content coming soon.</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 text-night shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercasest text-gray-500 mb-2">
              Ready to make it real?
            </p>
            <h3 className="text-xl font-bold mb-3">Start a trip from this guide</h3>
            <p className="text-sm text-charcoal mb-5 leading-relaxed max-w-lg">
              Create the trip record first, then turn this guide into stays, flights, food, and activities. Buddy is still available when conversation adds value.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={startTripHref}
                className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white hover:bg-brand-700 text-sm font-bold px-5 py-3 rounded-full transition-colors shadow-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                Start trip from guide
              </Link>
              <Link
                href={buddyHref}
                className="inline-flex items-center justify-center gap-2 border border-gray-300 bg-white text-night hover:border-gray-400 hover:bg-gray-50 text-sm font-bold px-5 py-3 rounded-full transition-colors"
              >
                Ask Buddy
              </Link>
            </div>
          </div>

          <nav className="mt-12 pt-6 border-t border-gray-200">
            <Link href="/guides" className="text-sm text-gray-500 hover:text-night transition-colors">
              Back to all guides
            </Link>
          </nav>
        </article>
      </main>

      <Footer />
    </div>
  )
}
