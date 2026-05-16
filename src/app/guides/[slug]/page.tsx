import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { BahaLogo } from '@/components/ui'
import Footer from '@/components/Footer'
import PortableTextBody from '@/components/PortableTextBody'
import { fetchDiscoverArticleBySlug, fetchAllArticleSlugs } from '@/lib/sanity/queries'

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
  const article = await fetchDiscoverArticleBySlug(params.slug)
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

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const article = await fetchDiscoverArticleBySlug(params.slug)
  if (!article) notFound()

  const planHref = `/dashboard?q=${encodeURIComponent(article.buddyPrompt)}`

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" />
          <nav className="flex items-center gap-4">
            <Link href="/guides" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Guides
            </Link>
            <Link href="/destinations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Destinations
            </Link>
            <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <div className="mb-6">
          <Link
            href="/guides"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All Guides
          </Link>
        </div>

        {/* Hero image */}
        {article.imageUrl && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-brand-100">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="bg-white/95 text-brand-700 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
                {article.category}
              </span>
              <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
                {article.readTime}
              </span>
            </div>
          </div>
        )}

        {/* Title */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            {article.title}
          </h1>
          <p className="mt-3 text-lg text-gray-500 leading-relaxed">{article.excerpt}</p>
          {article.publishedAt && (
            <time className="block mt-3 text-sm text-gray-400">
              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
        </header>

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
        <div className="mt-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 sm:p-8 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-100 mb-2">
            Ready to make it real?
          </p>
          <h3 className="text-xl sm:text-2xl font-bold mb-3">Plan this trip with Buddy</h3>
          <p className="text-sm text-brand-100 mb-5 leading-relaxed max-w-lg">
            Buddy can build a full day-by-day itinerary based on what you just read — with live
            hotel and flight options.
          </p>
          <Link
            href={planHref}
            className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 text-sm font-bold px-5 py-3 rounded-full transition-colors shadow-card"
          >
            Plan this with Buddy &rarr;
          </Link>
        </div>

        <nav className="mt-12 pt-6 border-t border-gray-200">
          <Link href="/guides" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
            &larr; Back to all guides
          </Link>
        </nav>
      </article>

      <Footer />
    </div>
  )
}
