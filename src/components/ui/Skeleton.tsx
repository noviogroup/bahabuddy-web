/**
 * Skeleton — animated placeholder for loading states.
 *
 * Used in `loading.tsx` files across the app to render skeleton UI
 * while server components fetch data. Pulses gently to indicate
 * activity without being distracting.
 *
 * Match the rough shape and dimensions of the eventual content — the
 * goal is "no layout shift when content arrives", not "exact preview".
 *
 * Uses Tailwind's built-in `animate-pulse`. Server-renderable, no JS.
 *
 * D.9 a11y: `motion-reduce:animate-none` disables the pulse for users
 * with `prefers-reduced-motion: reduce`. They still see a static
 * placeholder shape — communicating "content loading" structurally
 * without the animation that can trigger vestibular issues.
 */

import type { ReactNode } from 'react'

interface SkeletonProps {
  /** Tailwind classes to control width/height/shape. */
  className?: string
  /** Optional rounded variant — default is `rounded-md`. */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const ROUND_CLS: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  none: 'rounded-none',
  sm:   'rounded-sm',
  md:   'rounded-md',
  lg:   'rounded-lg',
  xl:   'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
}

export default function Skeleton({ className, rounded = 'md' }: SkeletonProps): ReactNode {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-gray-200 animate-pulse motion-reduce:animate-none',
        ROUND_CLS[rounded],
        className,
      )}
    />
  )
}
