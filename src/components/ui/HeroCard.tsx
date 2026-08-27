'use client'

/**
 * HeroCard — full-width image card with gradient overlay and content.
 *
 * Used by:
 *  - Home Dashboard hero (3 adaptive states)
 *  - My Trip empty state
 *  - Buddy's Pick editorial card
 *  - Explore seasonal hero
 *
 * Mobile reference: lib/features/home/widgets/hero_card.dart and
 * BuddyPicksCard in home_sections.dart.
 *
 * The `overlay` prop controls the gradient over the image — most cards
 * want `bottom` so the text at the bottom is readable. Use `left` for
 * cards with side-anchored text (Buddy's Pick).
 */

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

type Overlay = 'bottom' | 'left' | 'dark' | 'none'

export interface HeroCardProps {
  /** Background image URL. Use a real Bahamas photo from BahaImages catalog. */
  imageUrl: string
  /** Alt text for the background image. */
  alt?: string
  /** Card height (Tailwind class or arbitrary value). Default h-60 (240px). */
  height?: string
  /** Top-left tag (e.g. "THIS WEEK", "THIS MONTH", "BOOKED"). */
  badge?: string
  /** Badge background — gold for editorial picks, brand for status. */
  badgeColor?: 'gold' | 'brand' | 'palm' | 'coral'
  /** Main headline (white text). */
  title: string
  /** Optional secondary line under title. */
  subtitle?: string
  /** Optional CTA pill at bottom-right. */
  ctaLabel?: string
  /** Gradient overlay style. Default 'bottom'. */
  overlay?: Overlay
  /** Click handler — makes whole card interactive. */
  onClick?: () => void
  /** Link target — takes precedence over onClick. */
  href?: string
  /** Extra content rendered inside the overlay (counter, progress bar, etc.). */
  children?: ReactNode
  className?: string
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const OVERLAY: Record<Overlay, string> = {
  bottom: 'bg-hero-bottom',
  left:   'bg-hero-left',
  dark:   'bg-hero-dark',
  none:   '',
}

const BADGE: Record<NonNullable<HeroCardProps['badgeColor']>, string> = {
  gold:  'bg-gold-500 text-night',
  brand: 'bg-brand-500 text-white',
  palm:  'bg-palm-500 text-white',
  coral: 'bg-coral-500 text-white',
}

export default function HeroCard({
  imageUrl,
  alt = '',
  height = 'h-60',
  badge,
  badgeColor = 'gold',
  title,
  subtitle,
  ctaLabel,
  overlay = 'bottom',
  onClick,
  href,
  children,
  className,
}: HeroCardProps) {
  const interactive = Boolean(onClick || href)

  const content = (
    <>
      {/* Background image */}
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 960px"
        className="object-cover"
        priority={false}
      />

      {/* Gradient overlay */}
      <div className={cn('absolute inset-0', OVERLAY[overlay])} aria-hidden="true" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
        {badge && (
          <span
            className={cn(
              'self-start text-xs font-boldst uppercase px-2 py-1 rounded mb-2',
              BADGE[badgeColor],
            )}
          >
            {badge}
          </span>
        )}
        <h3 className="text-white text-2xl font-bold leading-tight text-balance drop-shadow-sm">
          {title}
        </h3>
        {subtitle && (
          <p className="text-white/85 text-sm mt-1.5 leading-relaxed max-w-prose">
            {subtitle}
          </p>
        )}
        {children}
        {ctaLabel && (
          <span className="mt-4 self-start inline-flex items-center gap-1.5 bg-white/95 text-brand-700 font-semibold text-sm px-4 py-2 rounded-full backdrop-blur-sm">
            {ctaLabel}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </>
  )

  const wrapperClasses = cn(
    'relative w-full overflow-hidden rounded-baha-xl shadow-card',
    height,
    interactive && 'cursor-pointer transition-transform duration-300 hover:scale-[1.01] focus-visible:scale-[1.01]',
    className,
  )

  if (href) {
    return (
      <Link href={href} className={cn('block', wrapperClasses)}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn('block text-left', wrapperClasses)}>
        {content}
      </button>
    )
  }

  return <div className={wrapperClasses}>{content}</div>
}
