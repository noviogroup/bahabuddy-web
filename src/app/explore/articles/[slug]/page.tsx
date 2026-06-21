import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getArticle, getAllArticleSlugs } from '@/lib/article-content'
import { fetchArticleBySlug, fetchAllArticleSlugs } from '@/lib/sanity/queries'
import { ARTICLE_CATEGORY_LABEL } from '@/lib/sanity/types'
import Footer from '@/components/Footer'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import PortableTextBody from '@/components/PortableTextBody'
import { editorialBuddyHref, editorialTripHref } from '@/lib/editorial-planning-links'

/**
 * /explore/articles/[slug] — Editorial article reader.
 *
 * The "Read more" destination from Explore Discover cards. Rendering is
 * Sanity-first with a hardcoded fallback so the route works even before
 * the Studio is connected or has published the article.
 *
 * Wiring:
 *   - Session 12: built against the hardcoded `lib/article-content.ts`
 *     store. Each article was authored in code.
 *   - Session 13 (C.7b): switched to a Sanity-first lookup. If the
 *     Studio has an `article` document with the requested slug, we
 *     render its Portable Text body via <PortableTextBody>. Otherwise
 *     we fall back to the hardcoded ArticleContent. Slugs are unified:
 *     `generateStaticParams` returns the union of both sources so
 *     either authoring path produces a valid URL.
 *
 * Why two stores instead of migrating everything to Sanity: the six
 * hardcoded articles are good, ready-to-render content. Burning the
 * Studio to migrate them before there are any editors actively using
 * Studio would be premature. As editors author replacements in Sanity
 * (matched by slug), they automatically take over.
 *
 * Caching: revalidate every 5 minutes so newly-published Sanity
 * articles appear in production without a deploy. Hardcoded articles
 * don't change and would be fine fully-static, but a uniform 300s TTL
 * is simpler than maintaining two cache policies.
 */

export const revalidate = 300

export async function generateStaticParams() {
  // Take the union of hardcoded slugs + Sanity slugs so either source
  // produces a valid URL. The runtime page handler will resolve the
  // right body to render.
  const sanitySlugs = await fetchAllArticleSlugs()
  const hardcodedSlugs = getAllArticleSlugs()
  const all = Array.from(new Set([...sanitySlugs, ...hardcodedSlugs]))
  return all.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  // Prefer Sanity for SEO metadata when available.
  const sanityArticle = await fetchArticleBySlug(params.slug)
  if (sanityArticle) {
    return {
      title: `${sanityArticle.title} | Baha Buddy`,
      description: sanityArticle.excerpt,
      openGraph: {
        title: sanityArticle.title,
        description: sanityArticle.excerpt,
        images: sanityArticle.imageUrl ? [{ url: sanityArticle.imageUrl }] : undefined,
      },
    }
  }

  const article = getArticle(params.slug)
  if (!article) return { title: 'Article not found | Baha Buddy' }
  return {
    title: `${article.title} | Baha Buddy`,
    description: article.subtitle,
    openGraph: {
      title: article.title,
      description: article.subtitle,
      images: [{ url: article.heroImage }],
    },
  }
}

function formatReadTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return '5 min'
  return `${Math.round(minutes)} min`
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  // Sanity first. If a published article matches the slug, render its
  // Portable Text body. Otherwise fall through to the hardcoded store.
  const sanityArticle = await fetchArticleBySlug(params.slug)

  if (sanityArticle && sanityArticle.body && sanityArticle.body.length > 0) {
    const heroImage = sanityArticle.imageUrl ?? ''
    const planPrompt = `Tell me more about ${sanityArticle.title}`
    const startTripHref = editorialTripHref({
      returnTo: `/explore/articles/${params.slug}`,
      source: 'article',
      seed: `Use this Bahamas article as planning context: ${sanityArticle.title}. ${sanityArticle.excerpt}`,
    })
    const buddyHref = editorialBuddyHref(planPrompt)
    const categoryLabel =
      ARTICLE_CATEGORY_LABEL[sanityArticle.category] ?? sanityArticle.category

    return (
      <ArticleReaderLayout
        title={sanityArticle.title}
        subtitle={sanityArticle.excerpt}
        categoryLabel={categoryLabel}
        readTime={formatReadTime(sanityArticle.readTimeMinutes)}
        imageUrl={heroImage}
        startTripHref={startTripHref}
        buddyHref={buddyHref}
      >
        <div className="prose-baha">
          <PortableTextBody body={sanityArticle.body} />
        </div>
      </ArticleReaderLayout>
    )
  }

  // Fallback to hardcoded article store.
  const article = getArticle(params.slug)
  if (!article) notFound()

  const startTripHref = editorialTripHref({
    returnTo: `/explore/articles/${params.slug}`,
    source: 'article',
    seed: article.buddyPrompt,
  })
  const buddyHref = editorialBuddyHref(article.buddyPrompt)

  return (
    <ArticleReaderLayout
      title={article.title}
      subtitle={article.subtitle}
      categoryLabel={article.category}
      readTime={article.readTime}
      imageUrl={article.heroImage}
      startTripHref={startTripHref}
      buddyHref={buddyHref}
    >
      <ArticleProse text={article.intro} className="text-base sm:text-lg" />

      {/* Sections */}
      <div className="mt-8 space-y-8">
        {article.sections.map((section, idx) => (
          <section key={idx}>
            <h2 className="text-xl sm:text-2xl font-bold text-night mb-3">
              {section.heading}
            </h2>
            <ArticleProse text={section.body} />
          </section>
        ))}
      </div>

      {/* Callout */}
      {article.callout && (
        <aside className="mt-10 rounded-r-xl border-l-4 border-gray-300 bg-gray-50 p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-charcoal">
            {article.callout.title}
          </p>
          <ArticleProse text={article.callout.body} className="text-gray-700" />
        </aside>
      )}
    </ArticleReaderLayout>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ArticleReaderLayout({
  title,
  subtitle,
  categoryLabel,
  readTime,
  imageUrl,
  startTripHref,
  buddyHref,
  children,
}: {
  title: string
  subtitle: string
  categoryLabel: string
  readTime: string
  imageUrl: string | null
  startTripHref: string
  buddyHref: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow={categoryLabel}
        title={title}
        subtitle={subtitle}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/explore', label: 'Explore' },
          { label: categoryLabel },
        ]}
        actions={(
          <>
            <Link
              href={startTripHref}
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gold-400 align-middle" aria-hidden="true" />
              Start trip from article
            </Link>
            <Link
              href={buddyHref}
              className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Ask Buddy
            </Link>
          </>
        )}
      >
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-charcoal ring-1 ring-gray-200">
            {categoryLabel}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-charcoal ring-1 ring-gray-200">
            {readTime} read
          </span>
        </div>
      </CompactPageHeader>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <ImageWithSourcePolicy
          src={imageUrl}
          alt={title}
          title={title}
          eyebrow={categoryLabel}
          description="Article content is available. Article image is not available yet."
          className="mb-8 aspect-[16/7] min-h-[220px] rounded-baha-xl border border-gray-200 shadow-sm"
          imageClassName="object-cover"
          sizes="(max-width: 768px) 100vw, 896px"
          priority
          tone="island"
          pendingLabel="Photo pending"
        />

        <article className="mx-auto max-w-3xl">
          {children}
          <ArticlePlanningPanel startTripHref={startTripHref} buddyHref={buddyHref} />
          <ArticleFooterLink />
        </article>
      </main>

      <Footer />
    </div>
  )
}

/** Bottom-of-article repeat link to Explore. */
function ArticleFooterLink() {
  return (
    <nav className="mt-12 pt-6 border-t border-gray-200" aria-label="More from Explore">
      <Link
        href="/explore"
        className="text-sm text-gray-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded"
      >
        Read more from Explore
      </Link>
    </nav>
  )
}

/** The direct planning panel that closes every article. */
function ArticlePlanningPanel({
  startTripHref,
  buddyHref,
}: {
  startTripHref: string
  buddyHref: string
}) {
  return (
    <div className="mt-12 rounded-baha-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-charcoal">
        Ready to make it real?
      </p>
      <h3 className="mb-3 text-xl font-bold text-night sm:text-2xl">
        Start a trip from this article
      </h3>
      <p className="mb-5 max-w-lg text-sm leading-relaxed text-gray-600">
        Create the trip record first, then add stays, flights, restaurants, and tours directly. Buddy can help refine the plan when conversation adds value.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={startTripHref}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
          Start trip from article
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
        <Link
          href={buddyHref}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
        >
          Ask Buddy
        </Link>
      </div>
    </div>
  )
}

/**
 * ArticleProse — renders a string with \n\n paragraph breaks as a
 * series of <p> elements. Avoids dangerouslySetInnerHTML; the hardcoded
 * content is plain text by design (no HTML, no Markdown).
 *
 * Used only for the hardcoded fallback path. Sanity-sourced articles
 * render through <PortableTextBody> instead.
 */
function ArticleProse({ text, className = '' }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  return (
    <div className={`space-y-4 text-base text-gray-700 leading-relaxed ${className}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}
