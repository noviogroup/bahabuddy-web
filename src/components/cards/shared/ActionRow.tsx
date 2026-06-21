'use client'

/**
 * ActionRow — small horizontal cluster of secondary affordances.
 *
 * Used in the expanded state of every card to surface utilities that
 * don't belong as the primary CTA — call the place, open its website,
 * see directions, save it to a trip. The primary action (e.g. "Book
 * now") stays inline on the card's main row; this is the supporting
 * action layer.
 *
 * Each button stops event propagation so that clicking an action
 * inside an expandable CardShell (which is itself a <button>) doesn't
 * collapse the card. Same reason links use stopPropagation: the user
 * tapping "Call" should not also re-toggle the parent card.
 */

import type { MouseEvent, ReactNode } from 'react'

export interface Action {
  /** Visible label (also used as aria-label for icon-only buttons). */
  label: string
  icon: ReactNode
  /** Either href OR onClick — not both. href takes precedence. */
  href?: string
  onClick?: () => void
  /** External links open in a new tab with rel="noopener". */
  external?: boolean
  /** Tone for the button. Default 'neutral'. */
  tone?: 'neutral' | 'brand' | 'palm' | 'coral'
  /** Hide the label and show icon-only (smaller). */
  iconOnly?: boolean
}

interface Props {
  actions: Action[]
  align?: 'left' | 'right' | 'spread'
  className?: string
}

const TONE_CLASSES: Record<NonNullable<Action['tone']>, string> = {
  neutral: 'border-gray-200 text-gray-700 hover:bg-gray-50',
  brand:   'border-gray-200 text-night hover:bg-gray-50',
  palm:    'border-palm-200 text-palm-700 hover:bg-palm-50',
  coral:   'border-coral-200 text-coral-700 hover:bg-coral-50',
}

function stop(e: MouseEvent<HTMLElement>) {
  e.stopPropagation()
}

export function ActionRow({ actions, align = 'left', className = '' }: Props) {
  if (!actions || actions.length === 0) return null

  const justify =
    align === 'right'  ? 'justify-end' :
    align === 'spread' ? 'justify-between' :
                          'justify-start'

  return (
    <div className={`flex items-center gap-1.5 ${justify} ${className}`}>
      {actions.map((a, i) => {
        const tone = TONE_CLASSES[a.tone ?? 'neutral']
        const sizeClass = a.iconOnly
          ? 'w-9 h-9 p-0 justify-center'
          : 'h-9 px-3 gap-1.5'

        const common = `inline-flex items-center text-xs font-semibold rounded-full border bg-white transition-colors ${tone} ${sizeClass}`

        if (a.href) {
          return (
            <a
              key={`${a.label}-${i}`}
              href={a.href}
              target={a.external ? '_blank' : undefined}
              rel={a.external ? 'noopener noreferrer' : undefined}
              onClick={stop}
              aria-label={a.iconOnly ? a.label : undefined}
              className={common}
            >
              {a.icon}
              {!a.iconOnly && <span>{a.label}</span>}
            </a>
          )
        }

        return (
          <button
            key={`${a.label}-${i}`}
            type="button"
            onClick={(e) => {
              stop(e)
              a.onClick?.()
            }}
            aria-label={a.iconOnly ? a.label : undefined}
            className={common}
          >
            {a.icon}
            {!a.iconOnly && <span>{a.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
