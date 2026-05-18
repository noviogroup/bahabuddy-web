'use client'

/**
 * MobileChatEntryBar — bottom-anchored chat entry for narrow viewports.
 *
 * Mobile reference: lib/features/home/widgets/chat_entry_bar.dart
 *
 * On desktop (xl ≥1280px) the docked chat panel in <DashboardShell> covers
 * the chat affordance, so this bar is hidden there. On tablet and phone
 * widths, tapping the bar opens the chat overlay (which is the same
 * <ChatPanel mode="docked"> rendered inside a slide-over).
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
    <div className="xl:hidden sticky bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2 bg-gradient-to-t from-offwhite via-offwhite to-transparent">
      <button
        onClick={openOverlay}
        className="w-full flex items-center gap-3 bg-white rounded-full pl-2 pr-4 py-2 shadow-card-hover border border-gray-200 hover:border-brand-300 transition-colors"
      >
        <BuddyAvatar size="sm" state="idle" />
        <span
          key={phIdx}
          className="flex-1 text-left text-sm text-gray-500 truncate animate-fade-in"
        >
          {PLACEHOLDERS[phIdx]}
        </span>
        <span className="shrink-0 w-9 h-9 bg-brand-500 rounded-full flex items-center justify-center text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </span>
      </button>
    </div>
  )
}
