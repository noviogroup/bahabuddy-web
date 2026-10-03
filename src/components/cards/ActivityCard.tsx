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
 *   - Top review snippet, when one exists in cached place reviews.
 *   - On expand: gallery, full description, hours (if the attraction
 *     publishes any), and action row (Call / Website / Directions / Add to trip).
 *
 * Linking: detail page lives at /explore/activities/[id] (public; the
 * dashboard's /activities/[id] copy is behind sign-in). Once Viator goes live,
 * `data.product_code` will swap in for booking-specific routing — the
 * Phase 2 work keeps the card prepared for that without changing the
 * compact-view UX.
 */

import { useState } from 'react'
import Link from 'next/link'
import { approvedActivityDetailHref } from '@/lib/approved-activities'
import { islandDisplayName } from '@/lib/island-config'
import {
  CardShell, Rating, ChipRow, ReviewSnippet, PhotoStrip, ActionRow, HoursBadge,
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
  /** Vibe tags from cached place inventory — also used to color the lead chip. */
  vibe_tags?: string[]
  kid_friendly?: boolean
  /** Activity duration string, e.g. "2-3 hours". */
  duration?: string
  /** Starting-from price in USD. */
  from_price?: number
  price_basis_label?: string
  booking_state_label?: string
  meeting_pickup_label?: string | null
  group_age_label?: string | null
  safety_access_label?: string | null
  cancellation_label?: string | null
  source_as_of_label?: string | null
  source_url?: string | null
  live_availability_state?: string | null
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
    price_basis_label, booking_state_label, meeting_pickup_label,
    group_age_label, safety_access_label, cancellation_label,
    source_as_of_label, source_url, live_availability_state,
    photo_url, photos = [],
    phone, website, full_address, opening_hours, top_review,
  } = data

  const detailHref = place_id ? approvedActivityDetailHref(place_id) : null
  const islandLabel = island ? islandDisplayName(island) : ''

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
  // Catalog listings carry no offer facts; show only facts that exist.
  const factRows = [
    ['Meeting / pickup', meeting_pickup_label],
    ['Group / age limits', group_age_label],
    ['Safety / access', safety_access_label],
    ['Cancellation', cancellation_label],
    ['Source status', source_as_of_label],
  ].filter((row): row is [string, string] => Boolean(row[1]))

  // ── Card body ────────────────────────────────────────────────────────

  const ratingOverlay = (rating ?? 0) > 0 ? (
    <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-sm">
      <Rating rating={rating} count={review_count} size="sm" showCount />
    </span>
  ) : null

  const kidBadge = kid_friendly ? (
    <span className="inline-flex items-center gap-1 bg-palm-500/95 text-white text-xs font-semibold uppercase px-1.5 py-0.5 rounded-md shadow-sm">
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
            <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{name}</p>
            {(supplier || islandLabel) && (
              <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1.5">
                <span className="text-gray-400">{I.mapPin}</span>
                <span className="truncate">{supplier || islandLabel}</span>
              </p>
            )}
          </div>
          {price_basis_label && (
            <span className="max-w-40 text-right text-xs font-bold leading-snug text-night">
              {price_basis_label}
            </span>
          )}
        </div>

        {/* Vibe tags */}
        {chips.length > 0 && (
          <ChipRow chips={chips} max={expanded ? undefined : 3} featuredFirst={false} />
        )}

        {/* Description */}
        {description && (
          <p className={`text-sm text-gray-600 leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
            {description}
          </p>
        )}

        {/* Duration + hours (today) — quick scan row */}
        {(duration || (opening_hours && opening_hours.length > 0)) && !expanded && (
          <div className="flex items-center gap-3 flex-wrap text-xs">
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

        {booking_state_label && (
          <p className="rounded-lg bg-brand-50 px-2.5 py-2 text-xs font-semibold text-brand-800">
            {booking_state_label}
          </p>
        )}

        {!expanded && size === 'compact' && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
              Tap for photos &amp; reviews {I.chevron}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              {detailHref && (
                <Link
                  href={detailHref}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-8 items-center rounded-full border border-brand-200 bg-white px-3 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
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
                  className="inline-flex h-8 items-center rounded-full bg-brand-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
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

            {factRows.length > 0 && (
              <dl className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
                {factRows.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[7rem_1fr] gap-2">
                    <dt className="font-bold text-gray-600">{label}</dt>
                    <dd className="text-gray-700">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {live_availability_state === 'requires_live_check' && (
              <p className="text-xs leading-5 text-gray-600">
                Price and availability are reference facts until the provider confirms them live.
              </p>
            )}

            {source_url?.trim() && (
              <a
                href={source_url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                View source<span className="sr-only"> (opens in new tab)</span>
              </a>
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
