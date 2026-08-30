'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { VendorMembership } from '@/lib/vendor-portal'

const navItems = [
  { href: '/vendor', label: 'Overview', icon: HomeIcon },
  { href: '/vendor/listings', label: 'Listings', icon: BuildingIcon },
  { href: '/vendor/profile', label: 'Profile updates', icon: UserEditIcon },
  { href: '/vendor/media', label: 'Media', icon: ImageIcon },
  { href: '/vendor/deals', label: 'Deals', icon: TagIcon },
  { href: '/vendor/performance', label: 'Performance', icon: ChartIcon },
]

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function iconProps(className?: string) {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
}

function HomeIcon({ className }: { className?: string }) {
  return <svg {...iconProps(className)}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
}

function BuildingIcon({ className }: { className?: string }) {
  return <svg {...iconProps(className)}><path d="M4 21V5a2 2 0 0 1 2-2h8v18" /><path d="M14 8h4a2 2 0 0 1 2 2v11" /><path d="M8 7h2M8 11h2M8 15h2M17 12h1M17 16h1" /></svg>
}

function UserEditIcon({ className }: { className?: string }) {
  return <svg {...iconProps(className)}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="m17 11 4 4" /><path d="m21 11-7 7h-4v-4l7-7" /></svg>
}

function ImageIcon({ className }: { className?: string }) {
  return <svg {...iconProps(className)}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10.5" r="1.5" /><path d="m21 15-4.5-4.5L7 20" /></svg>
}

function TagIcon({ className }: { className?: string }) {
  return <svg {...iconProps(className)}><path d="M20.5 13.5 13.5 20.5a2.1 2.1 0 0 1-3 0L3 13V3h10l7.5 7.5a2.1 2.1 0 0 1 0 3Z" /><path d="M7.5 7.5h.01" /></svg>
}

function ChartIcon({ className }: { className?: string }) {
  return <svg {...iconProps(className)}><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-8" /><path d="M22 19H2" /></svg>
}

export function VendorSidebar({ membership }: { membership: VendorMembership }) {
  const pathname = usePathname()
  const partner = membership.partner

  return (
    <aside className="flex w-full shrink-0 flex-col border-gray-200 bg-white md:min-h-screen md:w-64 md:border-r">
      <div className="bg-night px-5 py-6 text-white md:py-8">
        <Link href="/vendor" className="text-xl font-bold leading-7">
          Baha Buddy
        </Link>
        <div className="mt-8 text-sm font-semibold leading-5">Vendor Portal</div>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-b border-gray-200 p-3 md:flex-1 md:flex-col md:gap-1 md:overflow-visible md:border-b-0 md:p-4" aria-label="Vendor portal">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold leading-5 transition-colors',
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-night hover:bg-brand-50 hover:text-brand-700',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="hidden border-t border-gray-200 p-4 md:block">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {partner?.name?.slice(0, 2).toUpperCase() || 'VP'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-5 text-night">{partner?.name || 'Vendor access'}</div>
            <div className="text-xs font-semibold capitalize text-gray-500">{membership.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function VendorPartnerSwitcher({ memberships }: { memberships: VendorMembership[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activePartnerId = searchParams.get('partner_id') ?? memberships[0]?.partner_id ?? ''

  if (memberships.length <= 1) {
    const partner = memberships[0]?.partner
    return (
      <div className="flex min-h-11 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold leading-5 text-night">
        {partner?.name || 'Partner'}
      </div>
    )
  }

  return (
    <label className="block">
      <span className="sr-only">Switch partner</span>
      <select
        value={activePartnerId}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set('partner_id', event.target.value)
          router.push(`/vendor?${params.toString()}`)
        }}
        className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold leading-5 text-night outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-50"
      >
        {memberships.map((membership) => (
          <option key={membership.partner_id} value={membership.partner_id}>
            {membership.partner?.name || membership.partner_id}
          </option>
        ))}
      </select>
    </label>
  )
}
