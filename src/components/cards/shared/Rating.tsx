/**
 * Rating — Google-style star + score + review count.
 *
 * Sizes:
 *   - sm : 11px text, 12px star, no review count by default (use `showCount`)
 *   - md : 13px text, 14px star, count shown
 *   - lg : 15px text, 16px star, count shown
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
  /** Visual: defaults to gold star, set 'muted' for a more neutral look. */
  tone?: 'gold' | 'muted'
  className?: string
}

const SIZES = {
  sm: { star: 'text-[12px]', text: 'text-[11px]' },
  md: { star: 'text-sm',     text: 'text-xs' },
  lg: { star: 'text-base',   text: 'text-sm' },
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
  const starColor = tone === 'gold' ? 'text-gold-500' : 'text-gray-500'
  const display = Number(rating).toFixed(1)
  const showReviews = (showCount ?? (size !== 'sm')) && count && count > 0

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={`${starColor} ${s.star}`} aria-hidden="true">★</span>
      <span className={`text-gray-800 font-semibold ${s.text}`}>{display}</span>
      {showReviews && (
        <span className={`text-gray-500 ${s.text}`}>
          ({count!.toLocaleString()})
        </span>
      )}
    </span>
  )
}
