import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import GlobalPublicHeader from '@/components/GlobalPublicHeader'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bahabuddy.app'

// Brand typography — Plus Jakarta Sans across all weights (matches mobile BahaTypography).
// Exposed as a CSS variable so tailwind.config.ts can reference it via `var(--font-plus-jakarta)`.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
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
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Baha Buddy — AI-Powered Bahamas Travel',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Baha Buddy — Your AI Bahamas Travel Companion',
    description: 'Plan your perfect Bahamas trip with AI. 700+ islands, deals, flights & hotels.',
    images: ['/og-image.png'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="font-sans antialiased text-charcoal bg-offwhite">
        <AnalyticsProvider />
        <GlobalPublicHeader />
        {children}
      </body>
    </html>
  )
}
