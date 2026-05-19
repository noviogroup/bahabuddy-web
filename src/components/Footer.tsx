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
    title: 'Explore',
    links: [
      { href: '/', label: 'Home' },
      { href: '/destinations', label: 'Destinations' },
      { href: '/guides', label: 'Travel Guides' },
      { href: '/deals', label: 'Deals & Packages' },
      { href: '/explore/places', label: 'Places to See' },
    ],
  },
  {
    title: 'Plan your trip',
    links: [
      { href: '/dashboard/chat', label: 'Plan with Buddy' },
      { href: '/dashboard', label: 'My Trips' },
      { href: '/hotels', label: 'Hotels' },
      { href: '/flights', label: 'Flights' },
      { href: '/profile/bookings', label: 'My Bookings' },
    ],
  },
  {
    title: 'Travel support',
    links: [
      { href: '/dashboard/chat', label: 'Chat with Buddy' },
      { href: '/guides', label: 'Tips & how-tos' },
      { href: '/explore/quiz', label: 'Find your island' },
      { href: `mailto:${SUPPORT_EMAIL}`, label: 'Contact support' },
      { href: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: 'https://noviogroup.com', label: 'Novio Group', external: true },
      {
        href: 'mailto:hello@noviogroup.com?subject=Baha%20Buddy%20inquiry',
        label: 'Business inquiries',
      },
    ],
  },
]

function FooterLinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  const isExternalLink = (link: FooterLink) =>
    link.external || link.href.startsWith('mailto:') || link.href.startsWith('http')

  return (
    <nav aria-label={title}>
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={`${title}-${link.href}-${link.label}`}>
            {isExternalLink(link) ? (
              <a
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="text-brand-100/85 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-brand-100/85 hover:text-white transition-colors"
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
    <footer className="bg-brand-600 border-t border-brand-700 text-brand-100">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-10 mb-10">
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-3">
              <BahaLogo href="/" size="md" layout="pillWordmark" />
            </div>
            <p className="text-sm text-brand-100/90 leading-relaxed mb-4 max-w-sm">
              Your AI-powered Bahamas travel companion. Plan trips, find deals, and explore 700+
              islands — all from one app.
            </p>
            <StoreBadgeLinks height={40} className="justify-start" />
            <p className="mt-4 text-xs text-brand-200/80">
              Need help?{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-white/90 hover:text-white underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <FooterLinkColumn key={column.title} title={column.title} links={column.links} />
          ))}
        </div>

        <div className="border-t border-brand-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-200/80">
          <p>© {new Date().getFullYear()} Novio Group. All rights reserved.</p>
          <p>Built with ❤️ for Bahamas travelers everywhere</p>
        </div>
      </div>
    </footer>
  )
}
