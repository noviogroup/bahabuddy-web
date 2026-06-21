'use client'

/**
 * ConversationSidebar — list of past chat threads.
 *
 * Used by the standalone /dashboard/chat full-page view. The docked
 * ChatPanel uses a thread-picker dropdown instead.
 *
 * Theme: LIGHT (matches mobile chat).
 *
 * C.6 polish:
 *   - Loading state uses Skeleton primitives (visual continuity with
 *     the rest of the dashboard's loading.tsx files) instead of a
 *     plain text line.
 *   - Empty state has a friendly emoji + a clearer two-line message
 *     hinting at where the New Chat button is.
 *
 * D.9 a11y:
 *   - <nav aria-label="Conversation history"> landmark
 *   - All buttons have type="button" + focus-visible rings
 *   - Active conversation gets aria-current="true"
 *   - Decorative active-indicator stripe is aria-hidden
 */

import { useEffect, useState } from 'react'
import Skeleton from '@/components/ui/Skeleton'

export interface Conversation {
  id: string
  title: string | null
  last_message_preview: string | null
  updated_at: string
}

interface ConversationSidebarProps {
  conversations: Conversation[]
  loading: boolean
  activeId: string | null
  onSelect: (conv: Conversation) => void
  onNew: () => void
  guestMode?: boolean
}

function formatRelative(isoTimestamp: string): string {
  const ts = new Date(isoTimestamp).getTime()
  const now = Date.now()
  const diff = now - ts
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export default function ConversationSidebar({
  conversations,
  loading,
  activeId,
  onSelect,
  onNew,
  guestMode = false,
}: ConversationSidebarProps) {
  // formatRelative depends on the current time which differs between server
  // and client → only render timestamps after mount to avoid hydration warnings.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <button
          type="button"
          onClick={onNew}
          aria-label="Start new conversation with Baha Buddy"
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-full px-4 py-2.5 text-sm transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <nav aria-label="Conversation history" className="flex-1 overflow-y-auto py-2">
        {guestMode ? (
          <GuestConversationState />
        ) : loading ? (
          <LoadingList />
        ) : conversations.length === 0 ? (
          <EmptyConversationsState />
        ) : (
          <ul>
            {conversations.map(conv => {
              const active = activeId === conv.id
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conv)}
                    aria-current={active ? 'true' : undefined}
                    aria-label={`Open conversation: ${conv.title || conv.last_message_preview || 'New Chat'}`}
                    className={`w-full text-left px-4 py-3 transition-colors group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset ${
                      active
                        ? 'bg-brand-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-brand-500 rounded-r-full" aria-hidden="true" />
                    )}
                    <p className={`text-sm font-medium truncate ${
                      active ? 'text-brand-800' : 'text-night group-hover:text-brand-700'
                    }`}>
                      {conv.title || conv.last_message_preview || 'New Chat'}
                    </p>
                    {mounted && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatRelative(conv.updated_at)}
                      </p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          {guestMode ? 'Sign in to save conversations.' : 'Powered by Claude AI'}
        </p>
      </div>
    </aside>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────

function LoadingList() {
  // Match the visual rhythm of real conversation rows so layout doesn't
  // jump when threads load. Five rows is more than will typically fit
  // above the fold at this width but stays under-the-fold safe.
  return (
    <ul aria-busy="true" aria-label="Loading conversations">
      {[0, 1, 2, 3, 4].map(i => (
        <li key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3 mt-1.5" />
        </li>
      ))}
    </ul>
  )
}

function EmptyConversationsState() {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-semibold text-night mb-1">No conversations yet</p>
      <p className="text-xs text-gray-500 leading-relaxed max-w-[200px] mx-auto">
        Tap <span className="font-semibold text-brand-600">New Chat</span> above to start
        planning with Buddy. Your conversations will show up here.
      </p>
    </div>
  )
}

function GuestConversationState() {
  return (
    <div className="px-4 py-10">
      <p className="text-sm font-semibold text-night mb-1 text-center">Guest chat</p>
      <p className="text-xs text-gray-500 leading-relaxed max-w-[200px] mx-auto text-center">
        Ask Buddy about islands, hotels, food, flights, and tours. Sign in when you want to save trips, bookings, or conversation history.
      </p>
      <a
        href="/login?redirect=%2Fdashboard%2Fchat"
        className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-night transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
      >
        Sign in to save
      </a>
    </div>
  )
}
