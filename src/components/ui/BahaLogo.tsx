import Image from 'next/image'
import Link from 'next/link'
import { LOGO_SRC } from '@/lib/brand'

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
  href?: string
  className?: string
  priority?: boolean
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export default function BahaLogo({
  size = 'md',
  variant = 'default',
  href = '/',
  className,
  priority = false,
}: BahaLogoProps) {
  const h = HEIGHT[size]
  const img = (
    <Image
      src={LOGO_SRC}
      alt="Baha Buddy"
      width={Math.round(h * 3.2)}
      height={h}
      priority={priority}
      className={cn('h-auto w-auto object-contain', VARIANT_CLASS[variant], className)}
      style={{ height: h, width: 'auto' }}
    />
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-sm">
        {img}
      </Link>
    )
  }

  return <span className="inline-flex shrink-0 items-center">{img}</span>
}
