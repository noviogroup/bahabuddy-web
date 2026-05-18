'use client'

/**
 * PillButton — the default primary CTA across the dashboard.
 *
 * Rounded-full, semibold, brand-colored. Mirrors mobile
 * `elevatedButtonTheme` from baha_theme.dart which uses radiusFull
 * (999px) and BahaColors.ocean.
 *
 * Variants:
 *   - primary:   brand-500 fill, white text (default; the "do the main thing" button)
 *   - secondary: white fill, brand text, brand border
 *   - gold:      gold-500 fill, night text — reserved for "Book this" / standout actions
 *   - ghost:     transparent, brand text, hover tints
 *   - danger:    red, for destructive confirmations only
 *
 * If `href` is set, renders as a Next.js <Link>. Otherwise a <button>.
 */

import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  className?: string
}

export type PillButtonProps =
  | (CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
  | (CommonProps & { href: string; onClick?: never; type?: never; disabled?: never })

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const VARIANT: Record<Variant, string> = {
  primary:   'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-card',
  secondary: 'bg-white text-brand-700 border border-brand-200 hover:border-brand-500 hover:bg-brand-50',
  gold:      'bg-gold-500 text-night hover:bg-gold-600 active:bg-gold-700 shadow-gold-glow',
  ghost:     'bg-transparent text-brand-600 hover:bg-brand-50 active:bg-brand-100',
  danger:    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
}

const SIZE: Record<Size, string> = {
  sm: 'text-xs px-4 py-2 gap-1.5',
  md: 'text-sm px-5 py-2.5 gap-2',
  lg: 'text-base px-6 py-3.5 gap-2',
}

const SPINNER = (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
  </svg>
)

export default function PillButton(props: PillButtonProps) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    iconLeft,
    iconRight,
    fullWidth,
    loading,
    className,
  } = props

  const classes = cn(
    'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-current',
    VARIANT[variant],
    SIZE[size],
    fullWidth && 'w-full',
    className,
  )

  const inner = (
    <>
      {loading ? SPINNER : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </>
  )

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {inner}
      </Link>
    )
  }

  const { onClick, type = 'button', disabled, ...rest } = props as CommonProps & ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {inner}
    </button>
  )
}
