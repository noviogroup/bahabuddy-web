'use client'

/**
 * MobileChatEntryBar — reserved chat dock for phone viewports.
 *
 * Mobile reference: lib/features/home/widgets/chat_entry_bar.dart
 *
 * DashboardShell renders this outside the scrolling content so it stays
 * available without covering trip cards or form actions. Tablet and desktop
 * widths use the floating/docked chat controls instead.
 *
 * Because the overlay state lives in DashboardShell, this bar communicates
 * via a custom event: dispatching `baha:open-chat-overlay` on the window.
 * DashboardShell listens for that event and opens the overlay.
 */

import { useEffect, useState } from 'react'
import { BuddyAvatar } from '@/components/ui'

const PLACEHOLDERS = [
  "Tell me what you're thinking…",
  'Got a trip idea? Let\'s talk…',
  'Ask me anything about the Bahamas…',
  'Where should I go this year?',
]

export default function MobileChatEntryBar() {
  const [phIdx, setPhIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setPhIdx(i => (i + 1) % PLACEHOLDERS.length)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  function openOverlay() {
    window.dispatchEvent(new CustomEvent('baha:open-chat-overlay'))
  }

  return (
    <div className="shrink-0 border-t border-gray-200 bg-offwhite px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:hidden">
      <button
        type="button"
        onClick={openOverlay}
        className="flex min-h-14 w-full items-center gap-3 rounded-full border border-gray-200 bg-white py-2 pl-2 pr-3 shadow-card-hover transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
      >
        <BuddyAvatar size="sm" state="idle" />
        <span
          key={phIdx}
          className="flex-1 text-left text-sm text-gray-500 truncate animate-fade-in"
        >
          {PLACEHOLDERS[phIdx]}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </span>
      </button>
    </div>
  )
}
