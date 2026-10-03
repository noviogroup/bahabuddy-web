'use client'

import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'

import FeaturedExperiencesCarousel, {
  type FeaturedExperience,
} from '@/components/home/FeaturedExperiencesCarousel'
import TripStylePicker from '@/components/home/TripStylePicker'
import { useTripStyles } from '@/hooks/useTripStyles'
import {
  rankByTripStyles,
  tripStyleHeading,
} from '@/lib/trip-styles'

/** Cards shown; the server may send more so a chosen style can promote them. */
export const TOP_PICKS_DISPLAY_LIMIT = 12
const CARD_SELECTOR = '[data-testid="featured-experience-card"]'
const REORDER_MS = 280

/**
 * "Top things to do" header + shelf. The server HTML is the same for every
 * visitor (default heading, admin order). After mount the stored trip styles
 * re-rank the picks by `tripStyles` / `priceTier`, and the cards glide to
 * their new slots (FLIP, skipped for reduced motion).
 */
export default function PersonalizedTopPicks({
  experiences,
  eyebrow,
  defaultTitle,
  description,
  action,
}: {
  experiences: FeaturedExperience[]
  eyebrow: string
  defaultTitle: string
  description: string
  action?: ReactNode
}) {
  const { styles, toggleStyle, setStyles } = useTripStyles({ syncProfile: true })
  const gridRef = useRef<HTMLDivElement>(null)
  const previousRects = useRef<Map<string, DOMRect> | null>(null)

  const visible = useMemo(
    () => rankByTripStyles(experiences, styles, (item) => item).slice(0, TOP_PICKS_DISPLAY_LIMIT),
    [experiences, styles],
  )
  const orderKey = visible.map((item) => item.href).join('|')
  // The picker is only useful when the picks carry style data.
  const canPersonalize = experiences.some((item) => (item.tripStyles?.length ?? 0) > 0)
  const heading = (canPersonalize ? tripStyleHeading(styles) : null) ?? defaultTitle

  // Snapshot card positions during render, before React commits a new order.
  const lastOrderKey = useRef(orderKey)
  if (lastOrderKey.current !== orderKey) {
    previousRects.current = measureCards(gridRef.current)
    lastOrderKey.current = orderKey
  }

  useLayoutEffect(() => {
    const before = previousRects.current
    previousRects.current = null
    const grid = gridRef.current
    if (!before || !grid || prefersReducedMotion()) return
    for (const card of Array.from(grid.querySelectorAll<HTMLElement>(CARD_SELECTOR))) {
      if (typeof card.animate !== 'function') return
      const key = card.getAttribute('href') ?? ''
      const from = before.get(key)
      const to = card.getBoundingClientRect()
      if (!from) {
        card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REORDER_MS, easing: 'ease-out' })
        continue
      }
      const dx = from.left - to.left
      const dy = from.top - to.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      card.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: REORDER_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      )
    }
  }, [orderKey])

  return (
    <>
      <div className={`${canPersonalize ? 'mb-6' : 'mb-9'} flex flex-col gap-5 md:flex-row md:items-end md:justify-between`}>
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase text-brand-700">{eyebrow}</p>
          <h2
            id="featured-experiences-title"
            className="mt-3 text-2xl font-bold leading-tight text-night "
          >
            {heading}
          </h2>
          <p className="mt-3 text-base font-medium leading-7 text-charcoal">{description}</p>
        </div>
        {action}
      </div>

      {canPersonalize && (
        <div className="mb-6">
          <TripStylePicker selected={styles} onToggle={toggleStyle} onClear={() => setStyles([])} />
        </div>
      )}

      <div ref={gridRef}>
        <FeaturedExperiencesCarousel experiences={[...visible]} />
      </div>
    </>
  )
}

function measureCards(grid: HTMLElement | null): Map<string, DOMRect> | null {
  if (!grid) return null
  const rects = new Map<string, DOMRect>()
  for (const card of Array.from(grid.querySelectorAll<HTMLElement>(CARD_SELECTOR))) {
    rects.set(card.getAttribute('href') ?? '', card.getBoundingClientRect())
  }
  return rects
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}
