'use client'

/**
 * RestaurantCard — info-dense restaurant card for chat, list pages, and trip surfaces.
 *
 * Follows the same architecture as HotelCard:
 *
 *   compact  → expandable inline (chat surface)
 *   default  → links to /restaurants/[id]   (list pages)
 *   detail   → always-expanded plain shell  (embedded in detail pages)
 *
 * Decision-supporting differences vs HotelCard:
 *
 *   - Price displayed as a tier ($–$$$$), not a per-night number.
 *   - Cuisine type is the most-scanned signal — promoted to a coral-toned
 *     chip in the same row as the rating, so the eye gets cuisine in the
 *     first sweep.
 *   - Hours: today's hours show as a single line (collapsed) or full week
 *     table (expanded). Sourced from `opening_hours` array column.
 *   - Primary action when expanded is "Call" — restaurants are
 *     reservation-driven, and the phone number directly converts.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  CardShell, Rating, ReviewSnippet, PhotoStrip, ActionRow, HoursBadge,
} from './shared'
import type { Action } from './shared'

// ─── Types ────────────────────────────────────────────────────────────────

export interface RestaurantCardData {
  place_id?: string
  name: string
  island?: string
  island_id?: string
  cuisine?: string
  rating?: number
  review_count?: number
  /** 1–4 from google_places.price_level. Rendered as $ to $$$$. */
  price_level?: number
  photo_url?: string
  photos?: string[]
  phone?: string
  website?: string
  full_address?: string
  /** Flat array of "Monday: 11am – 10pm" / "Sunday: Closed" strings. */
  opening_hours?: string[]
  top_review?: {
    text: string
    author_name: string
    rating: number
    time: string
  }
}

interface Props {
  data: RestaurantCardData
  size?: 'compact' | 'default' | 'detail'
  onSave?: (data: RestaurantCardData) => void
  className?: string
}

// ─── Icon primitives ──────────────────────────────────────────────────────

const I = {
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  globe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
    </svg>
  ),
  mapPin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  heart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
}

/** Render the Google price_level (1–4) as $ to $$$$ with greyed-out remainder.
 *  Inline component — restaurants use this where hotels use a per-night number. */
function PriceLevelGlyph({ level }: { level: number }) {
  const clamped = Math.min(4, Math.max(1, level))
  return (
    <span className="font-bold text-brand-600 text-sm leading-none" aria-label={`Price level ${clamped} of 4`}>
      {'$'.repeat(clamped)}
      <span className="text-gray-300">{'$'.repeat(4 - clamped)}</span>
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export function RestaurantCard({ data, size = 'compact', onSave, className }: Props) {
  const [expanded, setExpanded] = useState(size === 'detail')

  const {
    place_id, name, island, cuisine,
    rating, review_count, price_level = 0,
    photo_url, photos = [],
    phone, website, full_address, opening_hours, top_review,
  } = data

  const detailHref = place_id ? `/restaurants/${encodeURIComponent(place_id)}` : null

  // Actions for expanded state — Call is primary for restaurants.
  const actions: Action[] = []
  if (phone) actions.push({
    label: 'Call', icon: I.phone, href: `tel:${phone.replace(/[^+\d]/g, '')}`, iconOnly: false, tone: 'brand',
  })
  if (website) actions.push({
    label: 'Menu', icon: I.globe, href: website, external: true, iconOnly: true,
  })
  if (full_address) actions.push({
    label: 'Directions',
    icon: I.mapPin,
    href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(full_address)}`,
    external: true,
    iconOnly: true,
  })
  if (onSave) actions.push({
    label: 'Save', icon: I.heart, onClick: () => onSave(data), iconOnly: true, tone: 'coral',
  })

  // ── Card body ────────────────────────────────────────────────────────

  const ratingOverlay = (rating ?? 0) > 0 ? (
    <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-sm">
      <Rating rating={rating} count={review_count} size="sm" showCount />
    </span>
  ) : null

  const body = (
    <>
      <PhotoStrip
        photos={photos}
        hero={photo_url}
        expanded={expanded}
        variant="restaurant"
        alt={`Photo of ${name}`}
        heroHeight={140}
        overlay={{ topLeft: ratingOverlay ?? undefined }}
      />

      <div className="p-3 space-y-2.5">
        {/* Identity + cuisine + price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-gray-900 leading-tight truncate">{name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {cuisine && (
                <span className="text-[11px] font-semibold text-coral-700 bg-coral-50 px-2 py-0.5 rounded-full">
                  {cuisine}
                </span>
              )}
              {island && (
                <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                  <span className="text-gray-400">{I.mapPin}</span>
                  <span className="truncate">{island}</span>
                </span>
              )}
            </div>
          </div>
          {price_level > 0 && (
            <div className="shrink-0">
              <PriceLevelGlyph level={price_level} />
            </div>
          )}
        </div>

        {/* Hours — collapsed shows today, expanded shows the full week */}
        {opening_hours && opening_hours.length > 0 && !expanded && (
          <HoursBadge hours={opening_hours} expanded={false} />
        )}

        {/* Review snippet — social proof */}
        {top_review && (
          <ReviewSnippet
            text={top_review.text}
            author={top_review.author_name}
            rating={top_review.rating}
            when={top_review.time}
            clamp={expanded ? 4 : 2}
            variant="callout"
          />
        )}

        {/* Expanded block */}
        {expanded && (
          <div className="space-y-2.5 pt-1">
            {full_address && (
              <p className="text-xs text-gray-500 leading-snug flex items-start gap-1.5">
                <span className="text-gray-400 mt-0.5">{I.mapPin}</span>
                <span>{full_address}</span>
              </p>
            )}

            {opening_hours && opening_hours.length > 0 && (
              <HoursBadge hours={opening_hours} expanded />
            )}

            {actions.length > 0 && <ActionRow actions={actions} align="left" />}

            {detailHref && size === 'compact' && (
              <Link
                href={detailHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                View full details {I.arrowRight}
              </Link>
            )}
          </div>
        )}

        {/* Collapsed-state affordance */}
        {!expanded && size === 'compact' && (
          <div className="flex items-center justify-end pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              Tap for hours &amp; reviews {I.chevron}
            </span>
          </div>
        )}
      </div>
    </>
  )

  // ── Shell selection ─────────────────────────────────────────────────

  if (size === 'compact') {
    return (
      <CardShell
        mode="expandable"
        onClick={() => setExpanded(v => !v)}
        expanded={expanded}
        ariaLabel={expanded ? `Collapse ${name}` : `Expand ${name} for more info`}
        className={className}
      >
        {body}
      </CardShell>
    )
  }

  if (size === 'default' && detailHref) {
    return (
      <CardShell mode="link" href={detailHref} ariaLabel={`View details for ${name}`} className={className} trackCardType="restaurant" trackCardId={place_id ?? undefined}>
        {body}
      </CardShell>
    )
  }

  return (
    <CardShell mode="plain" className={className}>
      {body}
    </CardShell>
  )
}
