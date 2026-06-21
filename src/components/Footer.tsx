import Link from 'next/link'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import { BahaLogo } from '@/components/ui'

type FooterLink = {
  href: string
  label: string
  external?: boolean
}

const SUPPORT_EMAIL = 'support@bahabuddy.com'

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Travel products',
    links: [
      { href: '/stays', label: 'Stays' },
      { href: '/flights', label: 'Flights' },
      { href: '/explore', label: 'Explore' },
      { href: '/guides', label: 'Guides' },
      { href: '/nassau-cruise-itineraries', label: 'Guided tours' },
      { href: '/deals', label: 'Deals' },
      { href: '/concierge-trip-plan', label: 'Concierge' },
    ],
  },
  {
    title: 'Bahamas destinations',
    links: [
      { href: '/explore/island/nassau-paradise-island', label: 'Nassau' },
      { href: '/explore/island/paradise-island', label: 'Paradise Island' },
      { href: '/explore/island/the-exumas', label: 'Exuma' },
      { href: '/explore/island/eleuthera-harbour-island', label: 'Eleuthera' },
      { href: '/explore/island/harbour-island', label: 'Harbour Island' },
      { href: '/explore/island/grand-bahama', label: 'Grand Bahama' },
      { href: '/explore/island/bimini', label: 'Bimini' },
      { href: '/explore/island/abacos', label: 'Abacos' },
      { href: '/explore/island/andros', label: 'Andros' },
      { href: '/explore/island/long-island', label: 'Long Island' },
    ],
  },
  {
    title: 'Stay types',
    links: [
      { href: '/stays?type=Hotel', label: 'Hotels' },
      { href: '/stays?type=Resort', label: 'Resorts' },
      { href: '/stays?type=Villa', label: 'Villas' },
      { href: '/stays?type=Home', label: 'Homes' },
      { href: '/stays?type=House', label: 'Houses' },
      { href: '/stays?type=Apartment', label: 'Apartments' },
      { href: '/stays?type=Condo', label: 'Condos' },
    ],
  },
  {
    title: 'Traveler support',
    links: [
      { href: '/dashboard', label: 'My trips' },
      { href: '/profile/bookings', label: 'My bookings' },
      { href: '/help', label: 'Help center' },
      { href: `mailto:${SUPPORT_EMAIL}`, label: 'Contact support' },
      { href: '/how-it-works', label: 'Travel requirements' },
      { href: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/partners', label: 'Partner with us' },
      { href: '/list-your-property', label: 'List your property' },
      { href: 'https://noviogroup.com', label: 'Novio Group', external: true },
      {
        href: 'mailto:hello@noviogroup.com?subject=Baha%20Buddy%20inquiry',
        label: 'Business inquiries',
      },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/accessibility', label: 'Accessibility' },
      { href: '/how-it-works', label: 'How Baha Buddy works' },
    ],
  },
]

function FooterLinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  const isExternalLink = (link: FooterLink) =>
    link.external || link.href.startsWith('mailto:') || link.href.startsWith('http')

  return (
    <nav aria-label={title}>
      <h3 className="mb-3 font-semibold text-night">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={`${title}-${link.href}-${link.label}`}>
            {isExternalLink(link) ? (
              <a
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="text-gray-600 transition-colors hover:text-night"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-gray-600 transition-colors hover:text-night"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white text-charcoal">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-7 gap-10 mb-10">
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-3">
              <BahaLogo href="/" size="md" layout="pillWordmark" />
            </div>
            <p className="mb-4 max-w-sm text-sm leading-relaxed text-gray-600">
              Your AI-powered Bahamas travel companion. Plan trips, find deals, and explore 700+
              islands — all from one app.
            </p>
            <StoreBadgeLinks height={40} className="justify-start" />
            <p className="mt-4 text-xs text-gray-500">
              Need help?{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-night underline underline-offset-2 hover:text-gray-700"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <FooterLinkColumn key={column.title} title={column.title} links={column.links} />
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 text-xs text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Novio Group. All rights reserved.</p>
          <p>Built for Bahamas travelers everywhere.</p>
        </div>
      </div>
    </footer>
  )
}
