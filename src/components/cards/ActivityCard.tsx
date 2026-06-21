'use client'

/**
 * ActivityCard — info-dense activity / attraction / experience card.
 *
 * Same architecture as Hotel/Restaurant cards. Activity-specific design
 * choices below.
 *
 * Decision-supporting elements:
 *
 *   - Hero photo with rating overlay + photo count.
 *   - Vibe tags as colored chips (beach, adventure, culture…), pulled from
 *     `vibe_tags` array. First-tag-as-featured promotion when present.
 *   - Kid-friendly checkmark badge when `kid_friendly === true` — the
 *     #1 question families ask, surfaced as a single glanceable signal.
 *   - Description as supporting copy (line-clamped to 2 in collapsed).
 *   - From-price (when set) in the bottom-right, mirroring Hotel layout.
 *   - Top review snippet, when one exists in google_place_reviews.
 *   - On expand: gallery, full description, hours (if the attraction
 *     publishes any), and action row (Call / Website / Directions / Add to trip).
 *
 * Linking: detail page lives at /activities/[id]. Once Viator goes live,
 * `data.product_code` will swap in for booking-specific routing — the
 * Phase 2 work keeps the card prepared for that without changing the
 * compact-view UX.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  CardShell, Rating, ChipRow, ReviewSnippet, PhotoStrip, ActionRow, HoursBadge, PriceTag,
} from './shared'
import type { Action, Chip } from './shared'

// ─── Types ────────────────────────────────────────────────────────────────

export interface ActivityCardData {
  place_id?: string
  /** Viator product code, when sourced from the Viator integration. */
  product_code?: string
  name: string
  island?: string
  island_id?: string
  description?: string
  rating?: number
  review_count?: number
  /** Vibe tags from google_places.vibe_tags — also used to color the lead chip. */
  vibe_tags?: string[]
  kid_friendly?: boolean
  /** Activity duration string, e.g. "2-3 hours". */
  duration?: string
  /** Starting-from price in USD. */
  from_price?: number
  /** Viator supplier name when applicable. */
  supplier?: string
  photo_url?: string
  photos?: string[]
  phone?: string
  website?: string
  full_address?: string
  opening_hours?: string[]
  top_review?: {
    text: string
    author_name: string
    rating: number
    time: string
  }
}

interface Props {
  data: ActivityCardData
  size?: 'compact' | 'default' | 'detail'
  onSave?: (data: ActivityCardData) => void
  className?: string
}

// ─── Icons ────────────────────────────────────────────────────────────────

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
  clock: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  kid: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
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

/** Vibe-tag to chip-tone mapping. Keeps the lead chip color-coded so the eye
 *  can sort cards by category at a glance ("water-sports" cards all coral,
 *  "culture" cards all gold). Defaults to brand-toned when no mapping exists. */
function vibeTagsToChips(tags: string[]): Chip[] {
  const TONE_MAP: Record<string, Chip['tone']> = {
    'water-sports': 'coral',
    'diving':       'coral',
    'beach':        'brand',
    'adventure':    'coral',
    'culture':      'gold',
    'foodie':       'coral',
    'romance':      'coral',
    'family':       'palm',
    'luxury':       'gold',
    'fishing':      'brand',
    'nightlife':    'coral',
    'spa':          'gold',
  }
  return tags.map(t => ({
    label: t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    tone: TONE_MAP[t] ?? 'brand',
  }))
}

// ─── Component ────────────────────────────────────────────────────────────

export function ActivityCard({ data, size = 'compact', onSave, className }: Props) {
  const [expanded, setExpanded] = useState(size === 'detail')

  const {
    place_id, name, island, description, duration, supplier,
    rating, review_count, vibe_tags = [], kid_friendly,
    from_price = 0,
    photo_url, photos = [],
    phone, website, full_address, opening_hours, top_review,
  } = data

  const detailHref = place_id ? `/activities/${encodeURIComponent(place_id)}` : null

  const actions: Action[] = []
  if (phone) actions.push({
    label: 'Call', icon: I.phone, href: `tel:${phone.replace(/[^+\d]/g, '')}`, iconOnly: true,
  })
  if (website) actions.push({
    label: 'Website', icon: I.globe, href: website, external: true, iconOnly: true,
  })
  if (full_address) actions.push({
    label: 'Directions',
    icon: I.mapPin,
    href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(full_address)}`,
    external: true, iconOnly: true,
  })
  if (onSave) actions.push({
    label: 'Add to trip', icon: I.heart, onClick: () => onSave(data), iconOnly: false, tone: 'coral',
  })

  const chips = vibeTagsToChips(vibe_tags)

  // ── Card body ────────────────────────────────────────────────────────

  const ratingOverlay = (rating ?? 0) > 0 ? (
    <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-sm">
      <Rating rating={rating} count={review_count} size="sm" showCount />
    </span>
  ) : null

  const kidBadge = kid_friendly ? (
    <span className="inline-flex items-center gap-1 bg-palm-500/95 text-white text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md shadow-sm">
      {I.kid}
      <span>Kid-friendly</span>
    </span>
  ) : undefined

  const body = (
    <>
      <PhotoStrip
        photos={photos}
        hero={photo_url}
        expanded={expanded}
        variant="activity"
        alt={`Photo of ${name}`}
        heroHeight={140}
        overlay={{
          topLeft: ratingOverlay ?? undefined,
          topRight: kidBadge,
        }}
      />

      <div className="p-3 space-y-2.5">
        {/* Identity */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-gray-900 leading-tight line-clamp-2">{name}</p>
            {(supplier || island) && (
              <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1.5">
                <span className="text-gray-400">{I.mapPin}</span>
                <span className="truncate">{supplier || island}</span>
              </p>
            )}
          </div>
          {from_price > 0 && (
            <PriceTag amount={from_price} variant="from" size="md" align="right" />
          )}
        </div>

        {/* Vibe tags */}
        {chips.length > 0 && (
          <ChipRow chips={chips} max={expanded ? undefined : 3} featuredFirst={false} />
        )}

        {/* Description */}
        {description && (
          <p className={`text-[13px] text-gray-600 leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
            {description}
          </p>
        )}

        {/* Duration + hours (today) — quick scan row */}
        {(duration || (opening_hours && opening_hours.length > 0)) && !expanded && (
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            {duration && (
              <span className="inline-flex items-center gap-1 text-gray-600">
                <span className="text-gray-400">{I.clock}</span>
                <span>{duration}</span>
              </span>
            )}
            {opening_hours && opening_hours.length > 0 && (
              <HoursBadge hours={opening_hours} expanded={false} />
            )}
          </div>
        )}

        {/* Review snippet */}
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

        {!expanded && size === 'compact' && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
              Tap for photos &amp; reviews {I.chevron}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              {detailHref && (
                <Link
                  href={detailHref}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-8 items-center rounded-full border border-brand-200 bg-white px-3 text-[11px] font-extrabold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  View details
                </Link>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSave(data)
                  }}
                  className="inline-flex h-8 items-center rounded-full bg-brand-600 px-3 text-[11px] font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  Add to trip
                </button>
              )}
            </div>
          </div>
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

      </div>
    </>
  )

  // ── Shell selection ──────────────────────────────────────────────────

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
      <CardShell mode="link" href={detailHref} ariaLabel={`View details for ${name}`} className={className} trackCardType="activity" trackCardId={place_id ?? undefined}>
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
