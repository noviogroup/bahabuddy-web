/**
 * PhotoStrip — hero image with overlay slots and an optional inline gallery.
 *
 * Two render modes selected by the `expanded` prop:
 *
 *   Default (collapsed)
 *     Single hero photo, fixed height. The auto-rendered "+N photos"
 *     pill (bottom-right) communicates that more images are one tap away.
 *     Parent cards can drop custom overlays into `overlay.topLeft`,
 *     `overlay.topRight`, and `overlay.bottomLeft` — typically a Rating
 *     chip, a save-heart, or an "Open now" status pill.
 *
 *   Expanded
 *     Same hero, plus a horizontally-scrollable thumbnail strip below
 *     it for the remaining photos. Used after the user taps to expand
 *     the card in chat — keeps everything inline, no router push.
 *
 * The `photos` prop is the canonical source of truth. `hero` is optional
 * — when absent the first photo doubles as hero. Both are gracefully
 * absent: when no images exist we render an honest branded pending state.
 */

import type { ReactNode } from 'react'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'

interface Props {
  photos?: string[]
  /** Specific hero photo URL. Falls back to photos[0]. */
  hero?: string | null
  /** Render the inline gallery below the hero. */
  expanded?: boolean
  /** Card type — controls the placeholder gradient when no photos exist. */
  variant?: 'hotel' | 'restaurant' | 'activity' | 'destination'
  /** Custom overlays positioned on top of the hero. */
  overlay?: {
    topLeft?: ReactNode
    topRight?: ReactNode
    bottomLeft?: ReactNode
  }
  /** Hero height in px. Default 160 (chat card). Use 220 for list pages. */
  heroHeight?: number
  /** Alt text for the hero image. */
  alt?: string
  className?: string
}

const IMAGE_TONE: Record<NonNullable<Props['variant']>, 'stay' | 'restaurant' | 'activity' | 'island'> = {
  hotel: 'stay',
  restaurant: 'restaurant',
  activity: 'activity',
  destination: 'island',
}

function pendingTitle(alt: string): string {
  return alt
    .replace(/^photo of\s+/i, '')
    .replace(/^photo for\s+/i, '')
    .trim() || 'Travel item'
}

const PENDING_EYEBROW: Record<NonNullable<Props['variant']>, string> = {
  hotel: 'Stay',
  restaurant: 'Restaurant',
  activity: 'Experience',
  destination: 'Destination',
}

export function PhotoStrip({
  photos = [],
  hero,
  expanded = false,
  variant = 'hotel',
  overlay,
  heroHeight = 160,
  alt = '',
  className = '',
}: Props) {
  const heroSrc = hero || photos[0] || null
  const photoCount = photos.length
  const moreThanOne = photoCount > 1

  return (
    <div className={className}>
      {/* Hero */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: heroHeight }}
      >
        <ImageWithSourcePolicy
          src={heroSrc}
          alt={alt}
          title={pendingTitle(alt)}
          eyebrow={PENDING_EYEBROW[variant]}
          description="Card details are available. Provider photo is not available yet."
          pendingLabel="Photo pending"
          className="h-full w-full"
          imageClassName="object-cover"
          sizes="(max-width: 640px) 100vw, 420px"
          tone={IMAGE_TONE[variant]}
          style={{ height: heroHeight }}
        />

        {overlay?.topLeft && (
          <div className="absolute top-2 left-2">{overlay.topLeft}</div>
        )}
        {overlay?.topRight && (
          <div className={`absolute ${heroSrc ? 'top-2' : 'bottom-2'} right-2`}>{overlay.topRight}</div>
        )}
        {overlay?.bottomLeft && (
          <div className="absolute bottom-2 left-2">{overlay.bottomLeft}</div>
        )}

        {/* Auto photo-count badge bottom-right */}
        {moreThanOne && !expanded && (
          <div className="absolute bottom-2 right-2 bg-black/55 text-white text-[11px] font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1 backdrop-blur-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="2" />
              <path d="M21 17l-4-4-8 8" />
            </svg>
            <span>{photoCount} photos</span>
          </div>
        )}
      </div>

      {/* Inline gallery — only when expanded and >1 photo exists */}
      {expanded && moreThanOne && (
        <div className="px-3 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory -mx-1 px-1">
            {photos.slice(1).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="h-20 w-28 object-cover rounded-lg shrink-0 snap-start"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
