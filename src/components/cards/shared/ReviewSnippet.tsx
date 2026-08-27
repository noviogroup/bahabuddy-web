/**
 * ReviewSnippet — a single quoted review used as social proof.
 *
 * Renders the quote in italic Figtree so social proof still feels
 * distinct while staying inside the Baha Buddy mobile typography system.
 *
 * Variants:
 *   - 'inline'  : flush, no padding, sits inside a row of other content.
 *   - 'callout' : padded neutral card. Use when the review is the
 *                 focal point of a section (default).
 *
 * Truncation: pass `clamp` to limit lines. Default is 2 lines —
 * keeps the card compact while still landing the social-proof punch.
 */

interface Props {
  text: string
  author?: string | null
  /** 1–5 reviewer rating. Renders as a compact text label before the quote. */
  rating?: number | null
  /** ISO date or relative label ("2 weeks ago"). */
  when?: string | null
  variant?: 'inline' | 'callout'
  /** Line-clamp limit (default 2). */
  clamp?: 1 | 2 | 3 | 4
  className?: string
}

const CLAMP = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
} as const

/** Convert a Date / ISO string to a relative "N weeks ago" label. */
function formatRelative(when: string | null | undefined): string | null {
  if (!when) return null
  const d = new Date(when)
  if (Number.isNaN(d.getTime())) return when // already a label
  const diffMs = Date.now() - d.getTime()
  const day = 1000 * 60 * 60 * 24
  const days = Math.floor(diffMs / day)
  if (days < 1)   return 'today'
  if (days < 7)   return `${days} day${days > 1 ? 's' : ''} ago`
  if (days < 30)  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`
}

export function ReviewSnippet({
  text,
  author,
  rating,
  when,
  variant = 'callout',
  clamp = 2,
  className = '',
}: Props) {
  if (!text) return null

  const relWhen = formatRelative(when)
  const container = variant === 'callout'
    ? 'p-2.5 bg-gray-50 rounded-xl'
    : ''

  return (
    <figure className={`${container} ${className}`}>
      {rating != null && rating > 0 && (
        <span className="text-charcoal text-xs font-bold">
          Rating {Number(rating).toFixed(1)}
        </span>
      )}
      <blockquote className={`italic text-sm font-medium leading-snug text-gray-800 ${CLAMP[clamp]}`}>
        &ldquo;{text.replace(/^["']|["']$/g, '')}&rdquo;
      </blockquote>
      {(author || relWhen) && (
        <figcaption className="text-xs text-gray-500 mt-1">
          {author && <span>— {author}</span>}
          {author && relWhen && <span>, </span>}
          {relWhen && <span>{relWhen}</span>}
        </figcaption>
      )}
    </figure>
  )
}
