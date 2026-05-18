import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getArticle, getAllArticleSlugs } from '@/lib/article-content'
import { fetchArticleBySlug, fetchAllArticleSlugs } from '@/lib/sanity/queries'
import { ARTICLE_CATEGORY_LABEL } from '@/lib/sanity/types'
import PortableTextBody from '@/components/PortableTextBody'

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
    const planHref = `/dashboard/chat?q=${encodeURIComponent(planPrompt)}`
    const categoryLabel =
      ARTICLE_CATEGORY_LABEL[sanityArticle.category] ?? sanityArticle.category

    return (
      <article className="max-w-3xl mx-auto px-4 py-8">
        <ArticleBackLink />

        {/* Hero */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-baha-lg overflow-hidden mb-6 bg-brand-100">
          {heroImage ? (
            <Image
              src={heroImage}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" aria-hidden="true" />
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="bg-white/95 text-brand-700 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
              {categoryLabel}
            </span>
            <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
              {formatReadTime(sanityArticle.readTimeMinutes)}
            </span>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-night leading-tight">
            {sanityArticle.title}
          </h1>
          <p className="mt-3 text-lg text-gray-500 leading-relaxed">
            {sanityArticle.excerpt}
          </p>
        </header>

        {/* Portable Text body */}
        <div className="prose-baha">
          <PortableTextBody body={sanityArticle.body} />
        </div>

        {/* Plan-this-with-Buddy CTA */}
        <PlanWithBuddyPanel href={planHref} />

        <ArticleFooterLink />
      </article>
    )
  }

  // Fallback to hardcoded article store.
  const article = getArticle(params.slug)
  if (!article) notFound()

  const planHref = `/dashboard/chat?q=${encodeURIComponent(article.buddyPrompt)}`

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <ArticleBackLink />

      {/* Hero */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-baha-lg overflow-hidden mb-6 bg-brand-100">
        <Image
          src={article.heroImage}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" aria-hidden="true" />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="bg-white/95 text-brand-700 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
            {article.category}
          </span>
          <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
            {article.readTime}
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-night leading-tight">
          {article.title}
        </h1>
        <p className="mt-3 text-lg text-gray-500 leading-relaxed">
          {article.subtitle}
        </p>
      </header>

      {/* Intro */}
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
        <aside className="mt-10 bg-brand-50 border-l-4 border-brand-500 rounded-r-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-700 mb-2">
            {article.callout.title}
          </p>
          <ArticleProse text={article.callout.body} className="text-gray-700" />
        </aside>
      )}

      <PlanWithBuddyPanel href={planHref} />

      <ArticleFooterLink />
    </article>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Top-of-page back link to Explore. */
function ArticleBackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Explore
      </Link>
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
        ← Read more from Explore
      </Link>
    </nav>
  )
}

/** The "Plan this with Buddy" gradient panel that closes every article. */
function PlanWithBuddyPanel({ href }: { href: string }) {
  return (
    <div className="mt-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-baha-lg p-6 sm:p-8 text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-100 mb-2">
        Ready to make it real?
      </p>
      <h3 className="text-xl sm:text-2xl font-bold mb-3">
        Plan this trip with Buddy
      </h3>
      <p className="text-sm text-brand-100 mb-5 leading-relaxed max-w-lg">
        Buddy can pull live data on hotels, restaurants, and flights — and assemble a full
        day-by-day plan based on what you just read.
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 text-sm font-bold px-5 py-3 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
      >
        Plan this with Buddy
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </Link>
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
