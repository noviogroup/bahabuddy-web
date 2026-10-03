/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — rights-cleared catalog media and user uploads.
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Sanity CMS image CDN — articles, destinations, deals.
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      // Bahamas Tourism Authority CDN — populates islands.hero_image_url
      // via seed_islands_deals_attractions.sql. Same source V2 mobile uses.
      {
        protocol: 'https',
        hostname: 'tempo.cdn.tambourine.com',
      },
      // Nassau Paradise Island official tourism CDN — hotel and
      // experience imagery (Atlantis, Baha Mar, Junkanoo, etc.).
      {
        protocol: 'https',
        hostname: 'www.nassauparadiseisland.com',
      },
      // Google Maps static-map cards. Place-photo CDN hosts are omitted:
      // provider photos require a fresh, visibly attributed presentation.
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      // Unsplash — DEPRECATED for product use but still in the
      // allowlist while we migrate every BahaImages consumer over
      // to the DB-driven islands.ts / canonical media layer. Safe to
      // remove once `src/lib/baha-images.ts` is fully retired.
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Wikimedia Commons — official App Store / Google Play badges.
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      // Airline logos — used when LiteAPI returns a carrier code but no
      // provider-hosted logo URL.
      {
        protocol: 'https',
        hostname: 'content.r9cdn.net',
        pathname: '/rimg/provider-logos/airlines/**',
      },
    ],
  },
}

export default nextConfig
