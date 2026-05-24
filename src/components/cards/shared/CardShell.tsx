'use client'

/**
 * CardShell — the outer wrapper every card uses.
 *
 * Three behaviors via the `mode` prop:
 *   - 'link'        : whole card is a clickable <Link>. Used on list pages,
 *                     in trip pages, anywhere we want navigation by default.
 *   - 'expandable'  : whole card is a <button>. Click toggles internal
 *                     `expanded` state in the parent card. Used in chat
 *                     so the user can see more without leaving the
 *                     conversation surface.
 *   - 'plain'       : non-interactive. Used for synthesis cards (Summary,
 *                     DayPlan, etc.) where the card itself isn't a CTA.
 *
 * Keeps the visual shell consistent — same border, radius, hover
 * elevation, focus ring — so every card type shares the chrome.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { track } from '@/lib/analytics'

export type CardShellMode = 'link' | 'expandable' | 'plain'

interface BaseProps {
  children: ReactNode
  /** Optional accent — used when the card needs to stand out (e.g. featured/recommended). */
  accent?: 'none' | 'brand' | 'gold'
  ariaLabel?: string
  className?: string
  /** Analytics: card type for tracking taps (e.g. 'hotel', 'activity'). */
  trackCardType?: string
  /** Analytics: card identifier for tracking taps. */
  trackCardId?: string
}

interface LinkProps extends BaseProps {
  mode: 'link'
  href: string
  onClick?: never
  expanded?: never
}

interface ExpandableProps extends BaseProps {
  mode: 'expandable'
  onClick: () => void
  expanded: boolean
  href?: never
}

interface PlainProps extends BaseProps {
  mode?: 'plain'
  href?: never
  onClick?: never
  expanded?: never
}

type Props = LinkProps | ExpandableProps | PlainProps

const baseClasses =
  'mt-2 rounded-2xl bg-white border overflow-hidden block w-full text-left transition-all'

function accentClasses(accent: BaseProps['accent']): string {
  switch (accent) {
    case 'brand': return 'border-brand-200 shadow-card'
    case 'gold':  return 'border-gold-300 shadow-card'
    default:      return 'border-gray-100 shadow-card'
  }
}

const interactiveClasses =
  'hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 cursor-pointer'

export function CardShell(props: Props) {
  const cn = `${baseClasses} ${accentClasses(props.accent)} ${props.className ?? ''}`

  if (props.mode === 'link') {
    const handleClick = () => {
      if (props.trackCardType) {
        track('card_tapped', { card_type: props.trackCardType, card_id: props.trackCardId ?? props.href })
      }
    }
    return (
      <Link href={props.href} aria-label={props.ariaLabel} className={`${cn} ${interactiveClasses}`} onClick={handleClick}>
        {props.children}
      </Link>
    )
  }

  if (props.mode === 'expandable') {
    return (
      <button
        type="button"
        onClick={props.onClick}
        aria-expanded={props.expanded}
        aria-label={props.ariaLabel}
        className={`${cn} ${interactiveClasses}`}
      >
        {props.children}
      </button>
    )
  }

  return (
    <div className={cn} aria-label={props.ariaLabel}>
      {props.children}
    </div>
  )
}
