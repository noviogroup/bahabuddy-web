import Image from 'next/image'
import Link from 'next/link'
import { LOGO_INTRINSIC, LOGO_SRC } from '@/lib/brand'

type Size = 'sm' | 'md' | 'lg'

const HEIGHT: Record<Size, number> = {
  sm: 28,
  md: 36,
  lg: 48,
}

/** `onDark` — full-color logo on photo/dark headers (drop shadow for legibility). */
type Variant = 'default' | 'onDark'

const VARIANT_CLASS: Record<Variant, string> = {
  default: '',
  onDark: 'drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]',
}

export interface BahaLogoProps {
  size?: Size
  variant?: Variant
  /** White pill with logo + blue “Baha Buddy” wordmark (marketing hero nav). */
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
      src={LOGO_SRC}
      alt={layout === 'pillWordmark' ? '' : 'Baha Buddy'}
      width={LOGO_INTRINSIC.width}
      height={LOGO_INTRINSIC.height}
      priority={priority}
      className={cn(
        'w-auto object-contain',
        layout === 'default' && VARIANT_CLASS[variant],
        className,
      )}
      style={{ height: h, width: 'auto' }}
    />
  )

  const inner =
    layout === 'pillWordmark' ? (
      <span className="inline-flex items-center gap-2.5 rounded-full bg-white pl-1 pr-4 py-1 shadow-md">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white overflow-hidden">
          {img}
        </span>
        <span className="text-[15px] font-semibold text-brand-600 tracking-tight whitespace-nowrap">
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
          'inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          layout === 'pillWordmark' ? 'rounded-full' : 'rounded-sm',
        )}
      >
        {inner}
      </Link>
    )
  }

  return <span className="inline-flex shrink-0 items-center">{inner}</span>
}
