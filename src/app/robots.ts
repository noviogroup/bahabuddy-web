import { MetadataRoute } from 'next'

/**
 * Private, transactional and per-user routes are disallowed. Entries are
 * written without a trailing slash so both `/profile` and `/profile/...` are
 * covered (robots rules are prefix matches). `/api/place-photo` stays crawlable
 * because public place pages render their photos through it.
 */
const ROBOTS_DISALLOW = [
  '/api/',
  '/dashboard',
  '/profile',
  '/trip',
  '/checkout',
  '/my-itinerary',
  '/share/',
  '/login',
  '/onboarding',
  '/vendor',
  '/auth/',
  '/stays/*/guests',
  '/stays/*/checkout',
  '/flights/*/book',
  '/flights/*/confirmation',
  '/concierge-trip-plan/checkout',
  '/concierge-trip-plan/success',
]

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bahabuddy.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/place-photo'],
        disallow: ROBOTS_DISALLOW,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
