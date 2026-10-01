import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import { LOGO_SRC } from '@/lib/brand'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import GlobalPublicHeader from '@/components/GlobalPublicHeader'
import TravelOriginPrompt from '@/components/TravelOriginPrompt'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bahabuddy.app'

// Brand typography — Figtree across all weights, matching mobile BahaTypography.
// Exposed as a CSS variable so tailwind.config.ts can reference it via `var(--font-figtree)`.
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Baha Buddy — Your AI Bahamas Travel Companion',
    template: '%s | Baha Buddy',
  },
  description:
    'Plan your perfect Bahamas trip with Baha Buddy. Discover 700+ islands, find deals, book flights & hotels, and get AI-powered travel advice — free on iOS and Android.',
  keywords: [
    'Bahamas travel',
    'Bahamas trip planner',
    'Bahamas vacation',
    'Nassau',
    'Exuma',
    'Eleuthera',
    'Bahamas islands',
    'Bahamas AI travel app',
    'Baha Buddy',
  ],
  authors: [{ name: 'Novio Group' }],
  creator: 'Novio Group',
  publisher: 'Novio Group',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Baha Buddy',
    title: 'Baha Buddy — Your AI Bahamas Travel Companion',
    description:
      'Plan your perfect Bahamas trip with AI. Discover 700+ islands, find deals, and book everything from one app.',
    // No explicit `images`: src/app/opengraph-image.tsx supplies the default
    // share image. Declaring images here would disable the file convention.
  },
  twitter: {
    // Title, description and image are inherited from each page's openGraph
    // (and opengraph-image.tsx), so share cards match the page being shared.
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

/**
 * Sitewide Organization + WebSite structured data. Lives in the root layout
 * (rather than the homepage) so the brand entity and sitelinks search box are
 * declared once for the whole site.
 */
const siteStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Baha Buddy',
      url: siteUrl,
      logo: new URL(LOGO_SRC, siteUrl).toString(),
      parentOrganization: {
        '@type': 'Organization',
        name: 'Novio Group',
        url: 'https://noviogroup.com',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'Baha Buddy',
      url: siteUrl,
      publisher: { '@id': `${siteUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="font-sans antialiased text-charcoal bg-offwhite">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-night focus:shadow-card focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData) }}
        />
        <AnalyticsProvider />
        <GlobalPublicHeader />
        <TravelOriginPrompt />
        {/* Skip-link target. Wraps every route so the link always lands after the header. */}
        <div id="main-content" tabIndex={-1} className="focus:outline-none">
          {children}
        </div>
      </body>
    </html>
  )
}
