'use client'

/**
 * BahaCard — base content surface.
 *
 * The default container for almost everything on the dashboard.
 * Mirrors the mobile `cardTheme` in baha_theme.dart (white background,
 * brand-tinted shadow, rounded-baha-lg = 16px).
 *
 * Variants:
 *   - default:  white bg, soft brand-tinted shadow (the standard)
 *   - gold:     white bg with gold-glow shadow — reserved for Buddy's Pick
 *   - subtle:   off-white bg, no shadow — for nested cards or list rows
 *   - flat:     transparent bg, just a border — for inline cards in chat
 *
 * Set `as` to render a different element (default: <div>). When `onClick`
 * (or `href`) is provided, the card gets hover/focus states.
 */

import Link from 'next/link'
import { forwardRef, type ReactNode, type HTMLAttributes, type ElementType } from 'react'

type Padding = 'none' | 'sm' | 'md' | 'lg'
type Variant = 'default' | 'gold' | 'subtle' | 'flat'

export interface BahaCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  children: ReactNode
  variant?: Variant
  padding?: Padding
  /** If provided, card renders as <Link>. */
  href?: string
  /** If provided (and no href), card becomes a button. */
  onClick?: () => void
  /** Override the wrapper element. Ignored when href/onClick set. */
  as?: ElementType
  className?: string
}

const PADDING: Record<Padding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

const VARIANT: Record<Variant, string> = {
  default: 'bg-white shadow-card',
  gold:    'bg-white shadow-gold-glow',
  subtle:  'bg-offwhite border border-gray-100',
  flat:    'bg-transparent border border-gray-200',
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const BahaCard = forwardRef<HTMLDivElement, BahaCardProps>(function BahaCard(
  {
    children,
    variant = 'default',
    padding = 'md',
    href,
    onClick,
    as,
    className,
    ...rest
  },
  ref,
) {
  const interactive = Boolean(href || onClick)
  const baseClasses = cn(
    'rounded-baha-lg transition-all duration-200',
    VARIANT[variant],
    PADDING[padding],
    interactive && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0',
    className,
  )

  if (href) {
    return (
      <Link href={href} className={cn('block', baseClasses)} {...(rest as Record<string, unknown>)}>
        {children}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('block w-full text-left', baseClasses)}
        {...(rest as Record<string, unknown>)}
      >
        {children}
      </button>
    )
  }

  const Element = (as ?? 'div') as ElementType
  return (
    <Element ref={ref} className={baseClasses} {...rest}>
      {children}
    </Element>
  )
})

export default BahaCard
