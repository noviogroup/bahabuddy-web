'use client'

/**
 * Sidebar — left rail navigation for the dashboard shell.
 *
 * Responsive widths:
 *   - Desktop ≥1280px: 240px, full labels visible
 *   - Tablet 1024–1279px: 64px, icon-only (labels in tooltip)
 *   - Phone <1024px: hidden by default; <MobileNavDrawer /> renders on open
 *
 * Mobile reference: lib/shared/widgets/main_shell.dart — the 4 bottom-tab
 * structure (Home / My Trip / Explore / Profile) ported to a vertical rail
 * on web. Active state mirrored from `navigationShell.currentIndex`.
 *
 * D.9 a11y:
 *   - <nav aria-label="Primary"> distinguishes this landmark from others
 *   - Active link gets `aria-current="page"`
 *   - Each Link has `aria-label` so the accessible name is stable even
 *     when the visible label is hidden (icon-only mode at 1024–1279px)
 *   - Active indicator dot's parent Link now has `relative` so the dot
 *     positions against the Link, not the document body (was a latent bug)
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { BahaLogo } from '@/components/ui'
import SignOutButton from '@/components/SignOutButton'
import { buildExplorePlacesHref } from '@/lib/explore-routing'

interface NavItem {
  href: string
  label: string
  icon: ReactNode
  /** Other paths that should also light up this item as active. */
  matchPrefixes?: string[]
}

const ICON_HOME = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 11v-6h4v6m-9 0h14a1 1 0 001-1V10" />
  </svg>
)

const ICON_LUGGAGE = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6a1 1 0 011 1v2H8V5a1 1 0 011-1zM5 7h14a1 1 0 011 1v11a2 2 0 01-2 2H6a2 2 0 01-2-2V8a1 1 0 011-1zm3 4v8m4-8v8m4-8v8" />
  </svg>
)

const ICON_COMPASS = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
  </svg>
)

const ICON_USER = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const ICON_BED = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 14h18M7 11V8a1 1 0 011-1h3a1 1 0 011 1v3" />
  </svg>
)

const ICON_FLIGHT = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3v-5a2 2 0 014 0v5l7 3v2l-7-2v3l2 1.5V20l-4-1-4 1v-1.5L10 17v-3l-7 2v-2z" />
  </svg>
)

const ICON_TICKET = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 100 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 100-4V7a2 2 0 012-2z" />
  </svg>
)

const THINGS_TO_DO_HREF = buildExplorePlacesHref({ search: 'things to do' })

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home',     icon: ICON_HOME,    matchPrefixes: ['/dashboard'] },
  { href: '/trip',      label: 'My Trip',  icon: ICON_LUGGAGE, matchPrefixes: ['/trip'] },
  { href: '/explore',   label: 'Explore',  icon: ICON_COMPASS, matchPrefixes: ['/explore'] },
  { href: '/profile',   label: 'Profile',  icon: ICON_USER,    matchPrefixes: ['/profile'] },
]

const BOOK_NOW_ITEMS: NavItem[] = [
  { href: '/stays',             label: 'Stays',         icon: ICON_BED,    matchPrefixes: ['/stays', '/hotels', '/hotel'] },
  { href: '/flights',           label: 'Flights',       icon: ICON_FLIGHT, matchPrefixes: ['/flights'] },
  { href: THINGS_TO_DO_HREF,    label: 'Things to Do',  icon: ICON_TICKET, matchPrefixes: ['/explore/places'] },
]

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true
  if (item.matchPrefixes?.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    // /dashboard should NOT light up when on /dashboard/chat — that's chat, not home
    if (item.href === '/dashboard' && pathname.startsWith('/dashboard/chat')) return false
    return true
  }
  return false
}

function labelVisibility(showLabels: boolean, isAutoExpanded: boolean): string {
  return cn(
    showLabels && 'block',
    !showLabels && isAutoExpanded && 'hidden xl:block',
    !showLabels && !isAutoExpanded && 'hidden',
  )
}

interface NavListProps {
  items: NavItem[]
  pathname: string
  showLabels: boolean
  isAutoExpanded: boolean
  onNavigate?: () => void
}

function NavList({ items, pathname, showLabels, isAutoExpanded, onNavigate }: NavListProps) {
  return (
    <ul className="space-y-1">
      {items.map(item => {
        const active = isActive(pathname, item)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              title={item.label}
              className={cn(
                'relative group flex items-center gap-3 rounded-baha-md px-3 py-2.5 transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                active
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-night',
              )}
            >
              <span className={cn('shrink-0', active && 'text-brand-600')} aria-hidden="true">
                {item.icon}
              </span>
              <span
                className={cn(
                  'text-base font-extrabold whitespace-nowrap',
                  active ? 'text-brand-700' : 'text-night',
                  labelVisibility(showLabels, isAutoExpanded),
                )}
              >
                {item.label}
              </span>
              {active && !showLabels && (
                <span
                  className={cn(
                    'absolute left-1 w-1 h-6 bg-brand-500 rounded-r-full',
                    isAutoExpanded && 'xl:hidden',
                  )}
                  aria-hidden="true"
                />
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export interface SidebarProps {
  /** Authenticated user email/identifier (shown in mini-card). */
  userEmail?: string
  /** Optional display name. Falls back to userEmail prefix. */
  displayName?: string
  /** Force a render variant. Used by mobile drawer to render labels at all widths. */
  variant?: 'auto' | 'expanded' | 'collapsed'
  /** Click handler used by the mobile drawer to dismiss after navigation. */
  onNavigate?: () => void
}

export default function Sidebar({
  userEmail,
  displayName,
  variant = 'auto',
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname() ?? ''

  // Responsive width classes
  // - variant='auto' (default desktop sidebar): 64px on lg, 240px on xl
  // - variant='expanded' (mobile drawer): full 280px
  // - variant='collapsed': 64px always
  const widthClass =
    variant === 'expanded' ? 'w-[280px]'
    : variant === 'collapsed' ? 'w-16'
    : 'w-16 xl:w-60'

  // Labels visible at xl, or always if expanded
  const showLabels = variant === 'expanded'
    ? true
    : variant === 'collapsed'
      ? false
      : false /* always start hidden; xl:show via class on each label */

  // For 'auto' we use Tailwind responsive classes on label spans below.
  const isAutoExpanded = variant === 'auto'

  const initials = (displayName || userEmail || '?')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      className={cn(
        'flex flex-col h-full shrink-0 bg-white border-r border-gray-200',
        widthClass,
        'transition-[width] duration-200',
      )}
    >
      {/* Brand mark */}
      <div className="flex items-center px-3 xl:px-5 py-5 border-b border-gray-100">
        <BahaLogo href="/dashboard" size="md" className="shrink-0 max-w-full" />
      </div>

      {/* Nav */}
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 xl:px-3 py-4">
        <NavList
          items={NAV_ITEMS}
          pathname={pathname}
          showLabels={showLabels}
          isAutoExpanded={isAutoExpanded}
          onNavigate={onNavigate}
        />

        <div className="mt-6">
          <h2
            className={cn(
              'px-3 mb-2 text-base font-extrabold text-night underline underline-offset-4 decoration-night/30',
              labelVisibility(showLabels, isAutoExpanded),
            )}
          >
            Book Now
          </h2>
          <NavList
            items={BOOK_NOW_ITEMS}
            pathname={pathname}
            showLabels={showLabels}
            isAutoExpanded={isAutoExpanded}
            onNavigate={onNavigate}
          />
        </div>
      </nav>

      {/* User mini-card */}
      <div className="border-t border-gray-100 p-3 xl:p-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm" aria-hidden="true">
            {initials}
          </div>
          <div
            className={cn(
              'flex-1 min-w-0',
              showLabels && 'block',
              !showLabels && isAutoExpanded && 'hidden xl:block',
              !showLabels && !isAutoExpanded && 'hidden',
            )}
          >
            {displayName && (
              <p className="text-sm font-semibold text-night truncate leading-tight">{displayName}</p>
            )}
            {userEmail && (
              <p className="text-xs text-gray-500 truncate leading-tight">{userEmail}</p>
            )}
            <div className="mt-1.5">
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
