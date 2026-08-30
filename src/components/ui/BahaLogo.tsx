import Image from 'next/image'
import Link from 'next/link'
import { LOGO_MARK_INTRINSIC, LOGO_MARK_SRC } from '@/lib/brand'

type Size = 'sm' | 'md' | 'lg'

const HEIGHT: Record<Size, number> = {
  sm: 28,
  md: 36,
  lg: 48,
}

/** `onDark` is kept for API compatibility; the logo itself never gets a plate. */
type Variant = 'default' | 'onDark'

const VARIANT_CLASS: Record<Variant, string> = {
  default: '',
  onDark: '',
}

export interface BahaLogoProps {
  size?: Size
  variant?: Variant
  /** Logo + blue “Baha Buddy” wordmark for public marketplace headers. */
  layout?: 'default' | 'pillWordmark'
  href?: string
  className?: string
  priority?: boolean
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const PILL_LOGO_HEIGHT: Record<Size, number> = {
  sm: 26,
  md: 30,
  lg: 34,
}

export default function BahaLogo({
  size = 'md',
  variant = 'default',
  layout = 'default',
  href = '/',
  className,
  priority = false,
}: BahaLogoProps) {
  const h = layout === 'pillWordmark' ? PILL_LOGO_HEIGHT[size] : HEIGHT[size]
  const img = (
    <Image
      src={LOGO_MARK_SRC}
      alt={layout === 'pillWordmark' ? '' : 'Baha Buddy'}
      width={LOGO_MARK_INTRINSIC.width}
      height={LOGO_MARK_INTRINSIC.height}
      priority={priority}
      className={cn(
        'w-auto object-contain',
        layout === 'default' && VARIANT_CLASS[variant],
      )}
      style={{ height: h, width: 'auto' }}
    />
  )

  const inner =
    layout === 'pillWordmark' ? (
      <span className="inline-flex items-center gap-0.5">
        <span className="inline-flex shrink-0 items-center justify-center">{img}</span>
        <span className="whitespace-nowrap text-sm font-semibold text-brand-600">
          Baha Buddy
        </span>
      </span>
    ) : (
      img
    )

  const label = layout === 'pillWordmark' ? 'Baha Buddy home' : 'Baha Buddy'

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        className={cn(
          'inline-flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600',
          className,
        )}
      >
        {inner}
      </Link>
    )
  }

  return <span className={cn('inline-flex shrink-0 items-center', className)}>{inner}</span>
}
