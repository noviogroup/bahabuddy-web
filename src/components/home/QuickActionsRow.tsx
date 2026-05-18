'use client'

/**
 * QuickActionsRow — 4 tappable tiles that open chat with a preloaded prompt.
 *
 * Mobile reference: lib/features/home/widgets/quick_actions_row.dart
 *
 * Each tile pushes /dashboard/chat?q=<encoded prompt>. The chat panel
 * picks up the ?q= param on mount and pre-fills the input.
 *
 * On wide layouts (xl with docked chat), this still navigates to the
 * standalone chat route — desktop users who clicked a tile clearly want
 * a focused chat experience. The docked panel doesn't read URL params.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

interface QuickAction {
  key: string
  label: string
  prompt: string
  icon: ReactNode
}

const ICON_PLUS = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" />
  </svg>
)

const ICON_FLIGHT = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3v-5a2 2 0 014 0v5l7 3v2l-7-2v3l2 1.5V20l-4-1-4 1v-1.5L10 17v-3l-7 2v-2z" />
  </svg>
)

const ICON_HOTEL = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V8a1 1 0 011-1h16a1 1 0 011 1v13M3 21h18M9 21V10m6 11V10M7 13h2m6 0h2M7 16h2m6 0h2" />
  </svg>
)

const ICON_ACTIVITIES = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l5-7 5 7m-5 0v9m-5 0h10M19 4l-2 4 2 4-2 4 2 4" />
  </svg>
)

const ACTIONS: QuickAction[] = [
  { key: 'new-trip',  label: 'New Trip',     prompt: 'Help me plan a new trip',               icon: ICON_PLUS },
  { key: 'flights',   label: 'Flights',      prompt: 'Help me find flights to the Bahamas',   icon: ICON_FLIGHT },
  { key: 'hotels',    label: 'Hotels',       prompt: 'Show me hotels in the Bahamas',         icon: ICON_HOTEL },
  { key: 'things',    label: 'Things to Do', prompt: 'What can I do in the Bahamas?',         icon: ICON_ACTIVITIES },
]

export default function QuickActionsRow() {
  return (
    <section aria-label="Quick actions" className="grid grid-cols-4 gap-2 md:gap-3">
      {ACTIONS.map(a => (
        <Link
          key={a.key}
          href={`/dashboard/chat?q=${encodeURIComponent(a.prompt)}`}
          className="group flex flex-col items-center gap-2 py-4 md:py-5 px-2 bg-white rounded-baha-lg border border-brand-50 shadow-soft hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="w-11 h-11 rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white flex items-center justify-center transition-colors duration-200">
            {a.icon}
          </span>
          <span className="text-xs md:text-sm font-semibold text-night text-center">{a.label}</span>
        </Link>
      ))}
    </section>
  )
}
