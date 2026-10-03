import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

/**
 * Root 404 for every public route.
 *
 * Rendered for unknown URLs and whenever a public page calls `notFound()`
 * (unknown place, restaurant, stay, tour, island or guide). The public
 * header comes from the root layout; this page adds the footer and a few
 * useful ways back into the site. Next.js also emits a noindex robots tag
 * for 404 responses; the explicit robots metadata below keeps that intent
 * visible in code.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  description: 'We could not find that Baha Buddy page. Explore the islands, browse stays, or head back home.',
  robots: { index: false, follow: true },
}

const RECOVERY_LINKS = [
  { href: '/explore', label: 'Explore the islands', description: 'Beaches, food, tours and island guides.' },
  { href: '/stays', label: 'Browse stays', description: 'Hotels, resorts, villas and homes across the Bahamas.' },
  { href: '/guides', label: 'Read travel guides', description: 'Practical tips for planning your trip.' },
]

export default function NotFound() {
  return (
    <>
      <main className="bg-offwhite px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase text-brand-600">Error 404</p>
          <h1 className="mt-3 text-3xl font-bold text-night">We couldn&apos;t find that page</h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray-600">
            The link may be out of date, or the place you&apos;re looking for has moved.
            Try one of these instead, or ask Buddy to help plan your trip.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-700"
            >
              Back to home
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Search Baha Buddy
            </Link>
          </div>

          <ul className="mt-12 grid gap-4 text-left sm:grid-cols-3">
            {RECOVERY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block h-full rounded-baha-lg border border-gray-200 bg-white p-5 shadow-soft transition-colors hover:border-brand-300"
                >
                  <span className="block font-semibold text-night">{link.label}</span>
                  <span className="mt-1 block text-sm text-gray-600">{link.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  )
}
