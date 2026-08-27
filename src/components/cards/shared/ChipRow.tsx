/**
 * ChipRow — small inline tags (amenities, vibes, dietary, etc).
 *
 * Features:
 *   - Overflow handling: `max` truncates and renders a "+N more" terminal chip
 *   - First-chip emphasis: optional `featured` flag promotes the first chip
 *     to a green "highlight" pill (e.g. "Beachfront" for a hotel) — a
 *     decision-anchor before the eye scans the rest.
 *   - `align`: left (default) or center.
 *
 * Sizes:
 *   - sm : 10px text, 6px padding
 *   - md : 11px text, 8px padding
 */

import type { ReactNode } from 'react'

export interface Chip {
  /** Display label. */
  label: string
  /** Override the default neutral style for one chip. */
  tone?: 'neutral' | 'brand' | 'palm' | 'coral' | 'gold'
  icon?: ReactNode
}

interface Props {
  chips: (string | Chip)[]
  /** Max chips to show before collapsing the rest into "+N more". */
  max?: number
  /** Style the first chip as a highlight (palm tone, dot indicator). */
  featuredFirst?: boolean
  size?: 'sm' | 'md'
  align?: 'left' | 'center'
  className?: string
}

const TONE_CLASSES: Record<NonNullable<Chip['tone']>, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  brand:   'bg-gray-100 text-night',
  palm:    'bg-palm-50 text-palm-700',
  coral:   'bg-coral-50 text-coral-700',
  gold:    'bg-gray-100 text-night',
}

function normalize(c: string | Chip): Chip {
  return typeof c === 'string' ? { label: c, tone: 'neutral' } : { tone: 'neutral', ...c }
}

export function ChipRow({
  chips,
  max,
  featuredFirst = false,
  size = 'sm',
  align = 'left',
  className = '',
}: Props) {
  if (!chips || chips.length === 0) return null

  const normalized = chips.map(normalize)
  const limited = max && normalized.length > max ? normalized.slice(0, max) : normalized
  const overflow = max && normalized.length > max ? normalized.length - max : 0

  const sizeClass = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-xs px-2.5 py-1'

  const justify = align === 'center' ? 'justify-center' : 'justify-start'

  return (
    <div className={`flex flex-wrap gap-1 ${justify} ${className}`}>
      {limited.map((chip, i) => {
        const isFeatured = featuredFirst && i === 0
        const tone: NonNullable<Chip['tone']> = isFeatured ? 'palm' : (chip.tone ?? 'neutral')
        return (
          <span
            key={`${chip.label}-${i}`}
            className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass} ${TONE_CLASSES[tone]}`}
          >
            {isFeatured && (
              <span className="w-1.5 h-1.5 rounded-full bg-palm-500" aria-hidden="true" />
            )}
            {chip.icon}
            <span>{chip.label}</span>
          </span>
        )
      })}
      {overflow > 0 && (
        <span className={`inline-flex items-center rounded-full font-medium bg-gray-50 text-gray-500 ${sizeClass}`}>
          +{overflow} more
        </span>
      )}
    </div>
  )
}
