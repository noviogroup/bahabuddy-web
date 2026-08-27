/**
 * PriceTag — display per-night, per-person, total, or "from" prices.
 *
 * Variants:
 *   - 'per_night'  : "$485 / night"  with optional total preview underneath
 *   - 'per_person' : "$220 / person" with optional total preview underneath
 *   - 'total'      : "$3,395 total"
 *   - 'from'       : "From $89"
 *
 * Pass `total` and `nights` (or `people`) to render a secondary line
 * computing the implied total stay/group cost — gives the user the
 * trust signal "this is what I'll actually pay" without surprising
 * them at checkout.
 *
 * Estimated prices (when DB only has price_level, not live inventory)
 * should set `isEstimate` so a small "From" label appears above the
 * number — calibrates expectations without scaring the user off.
 */

interface Props {
  amount: number
  variant?: 'per_night' | 'per_person' | 'total' | 'from'
  /** When set on per_night / per_person, renders a secondary line "~$X for N nights". */
  nights?: number
  /** When set on per_person, renders a secondary line "~$X for N people". */
  people?: number
  isEstimate?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Right-align the block (typical for card footers). */
  align?: 'left' | 'right'
  className?: string
}

const SIZE_PRIMARY = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
} as const

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

export function PriceTag({
  amount,
  variant = 'per_night',
  nights,
  people,
  isEstimate = false,
  size = 'md',
  align = 'right',
  className = '',
}: Props) {
  if (!amount || amount <= 0) return null

  const suffix =
    variant === 'per_night'  ? '/ night'   :
    variant === 'per_person' ? '/ person'  :
    variant === 'total'      ? 'total'     :
                                ''

  const prefix = variant === 'from' || isEstimate ? 'From' : null

  // Secondary preview line — "~$3,395 for 7 nights"
  let secondary: string | null = null
  if (variant === 'per_night' && nights && nights > 1) {
    secondary = `~${fmt(amount * nights)} for ${nights} nights`
  } else if (variant === 'per_person' && people && people > 1) {
    secondary = `~${fmt(amount * people)} for ${people} people`
  }

  const alignClass = align === 'right' ? 'text-right items-end' : 'text-left items-start'

  return (
    <div className={`flex flex-col ${alignClass} ${className}`}>
      {prefix && (
        <span className="text-xs font-semibold uppercase text-gray-400 leading-none mb-0.5">
          {prefix}
        </span>
      )}
      <div className="flex items-baseline gap-1">
        <span className={`font-bold text-brand-600 leading-none ${SIZE_PRIMARY[size]}`}>
          {fmt(amount)}
        </span>
        {suffix && (
          <span className="text-xs text-gray-500 font-medium">
            {suffix}
          </span>
        )}
      </div>
      {secondary && (
        <span className="text-xs text-gray-400 mt-0.5">{secondary}</span>
      )}
    </div>
  )
}
