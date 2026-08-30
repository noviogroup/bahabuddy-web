/**
 * Rating — compact numeric score + review count.
 *
 * Sizes:
 *   - sm : 11px text, no review count by default (use `showCount`)
 *   - md : 13px text, count shown
 *   - lg : 15px text, count shown
 *
 * Renders nothing if rating is missing or zero (caller doesn't have to guard).
 */

interface Props {
  /** 0–5 numeric rating. */
  rating: number | null | undefined
  /** Number of reviews behind that rating. */
  count?: number | null | undefined
  /** Hide the review count even on sizes that show it by default. */
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Legacy tone prop kept for callers; both variants render neutral marketplace text. */
  tone?: 'gold' | 'muted'
  className?: string
}

const SIZES = {
  sm: { text: 'text-xs' },
  md: { text: 'text-xs' },
  lg: { text: 'text-sm' },
} as const

export function Rating({
  rating,
  count,
  showCount,
  size = 'md',
  tone = 'gold',
  className = '',
}: Props) {
  if (!rating || rating <= 0) return null

  const s = SIZES[size]
  const labelColor = tone === 'gold' ? 'text-charcoal' : 'text-gray-600'
  const display = Number(rating).toFixed(1)
  const showReviews = (showCount ?? (size !== 'sm')) && count && count > 0

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={`${labelColor} font-bold ${s.text}`}>Rating {display}</span>
      {showReviews && (
        <span className={`text-gray-500 ${s.text}`}>
          ({count!.toLocaleString()})
        </span>
      )}
    </span>
  )
}
