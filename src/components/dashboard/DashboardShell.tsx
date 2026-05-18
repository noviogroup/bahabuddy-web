'use client'

/**
 * DashboardShell — 3-column layout for the authenticated dashboard.
 *
 * Responsive behavior (UI/UX Spec §4.2 + §6):
 *
 *   Desktop (≥1280px / xl):
 *     ┌─ Sidebar (240px) ─┬─ Main (flex) ─┬─ ChatPanel (380px) ─┐
 *
 *   Tablet (1024–1279px / lg):
 *     ┌─ Sidebar (64px icon-only) ─┬─ Main (flex) ─┐
 *     and <FloatingChatButton/> bottom-right
 *
 *   Phone (<1024px):
 *     ┌─ Main (full width) ─┐
 *     + top bar with hamburger → opens <Sidebar variant="expanded"/> drawer
 *     + <FloatingChatButton/> bottom-right (→ /dashboard/chat full page)
 *
 * D.9 a11y: both overlays (mobile nav, chat) now use `role="dialog"`
 * with `aria-modal="true"`, the hamburger reports `aria-expanded` /
 * `aria-controls`, and on open we move focus into the dialog (to the
 * close button) so keyboard + screen-reader users can navigate
 * predictably. Escape closes either overlay (was already wired).
 *
 * Each authenticated route imports this shell and passes its content as
 * children.
 */

import { useEffect, useId, useRef, useState } from 'react'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import { BahaLogo, BuddyAvatar } from '@/components/ui'

export interface DashboardShellProps {
  /** Authenticated user email (rendered in sidebar + chat header). */
  userEmail?: string
  /** Display name from users.display_name. */
  displayName?: string
  /** Main content (the route's page). */
  children: React.ReactNode
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export default function DashboardShell({
  userEmail,
  displayName,
  children,
}: DashboardShellProps) {
  const mobileNavId = useId()
  const chatOverlayId = useId()

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [chatOverlayOpen, setChatOverlayOpen] = useState(false)
  const [chatDocked, setChatDocked] = useState(true)

  // Refs for focus-on-open — points at each overlay's close button.
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null)
  const chatCloseRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll when an overlay is open
  useEffect(() => {
    const anyOpen = mobileNavOpen || chatOverlayOpen
    if (anyOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [mobileNavOpen, chatOverlayOpen])

  // Close any open overlay on Escape
  useEffect(() => {
    if (!mobileNavOpen && !chatOverlayOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false)
        setChatOverlayOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileNavOpen, chatOverlayOpen])

  // Move focus into the chat overlay when it opens (a11y: keyboard +
  // screen-reader users should land inside the dialog, not stranded
  // behind it). requestAnimationFrame waits one paint so the ref is
  // attached.
  useEffect(() => {
    if (chatOverlayOpen) {
      requestAnimationFrame(() => chatCloseRef.current?.focus())
    }
  }, [chatOverlayOpen])

  useEffect(() => {
    if (mobileNavOpen) {
      requestAnimationFrame(() => mobileNavCloseRef.current?.focus())
    }
  }, [mobileNavOpen])

  // External triggers — children inside <main> can dispatch this event to
  // open the chat overlay without prop drilling. Used by MobileChatEntryBar.
  useEffect(() => {
    const onOpen = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
        setChatDocked(true)
      } else {
        setChatOverlayOpen(true)
      }
    }
    window.addEventListener('baha:open-chat-overlay', onOpen as EventListener)
    return () => window.removeEventListener('baha:open-chat-overlay', onOpen as EventListener)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-offwhite text-night">
      {/* ── Left: Sidebar (desktop + tablet) ──────────────────────────── */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar userEmail={userEmail} displayName={displayName} variant="auto" />
      </div>

      {/* ── Center: Main content column ───────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile top bar (phone only) */}
        <div className="lg:hidden shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls={mobileNavId}
            className="text-gray-600 hover:text-night p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <BahaLogo href="/dashboard" size="sm" className="flex-1 min-w-0" />
        </div>

        {/* Page content (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* ── Right: Chat panel (desktop ≥1280px only) ──────────────────── */}
      {chatDocked && (
        <aside
          className="hidden xl:flex shrink-0 w-[380px] relative"
          aria-label="Chat with Buddy"
        >
          <ChatPanel
            mode="docked"
            userEmail={userEmail}
            onCollapse={() => setChatDocked(false)}
          />
        </aside>
      )}

      {/* ── Floating Buddy button (tablet + collapsed desktop) ────────── */}
      <FloatingChatButton
        showOn={chatDocked ? 'tablet-only' : 'all'}
        onClick={() => {
          // Desktop: re-open docked panel. Tablet/phone: open overlay.
          if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
            setChatDocked(true)
          } else {
            setChatOverlayOpen(true)
          }
        }}
      />

      {/* ── Mobile nav drawer (phone only) ────────────────────────────── */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 animate-fade-in motion-reduce:animate-none"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div
            id={mobileNavId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 z-50 animate-slide-up motion-reduce:animate-none"
          >
            {/* Hidden close button (focus target on open). Visible close
                affordance is via the backdrop click + Escape key. */}
            <button
              ref={mobileNavCloseRef}
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation menu"
              className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:right-3 focus:z-10 focus:bg-white focus:text-night focus:px-3 focus:py-1.5 focus:rounded-md focus:ring-2 focus:ring-brand-400"
            >
              Close menu
            </button>
            <Sidebar
              userEmail={userEmail}
              displayName={displayName}
              variant="expanded"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </>
      )}

      {/* ── Chat overlay (tablet + phone) ─────────────────────────────── */}
      {chatOverlayOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 xl:hidden animate-fade-in motion-reduce:animate-none"
            onClick={() => setChatOverlayOpen(false)}
            aria-hidden="true"
          />
          <div
            id={chatOverlayId}
            role="dialog"
            aria-modal="true"
            aria-label="Chat with Buddy"
            className="fixed inset-y-0 right-0 z-50 xl:hidden w-full sm:w-[420px] max-w-full animate-slide-up motion-reduce:animate-none bg-white"
          >
            <div className="relative h-full">
              <button
                ref={chatCloseRef}
                type="button"
                onClick={() => setChatOverlayOpen(false)}
                aria-label="Close chat"
                className="absolute top-3.5 right-4 z-10 text-gray-400 hover:text-night transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <ChatPanel mode="docked" userEmail={userEmail} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── FloatingChatButton ──────────────────────────────────────────────────

interface FloatingChatButtonProps {
  /** 'tablet-only' shows on lg but hidden on xl (chat is docked there).
   *  'all' shows on every breakpoint. */
  showOn: 'tablet-only' | 'all'
  onClick: () => void
}

function FloatingChatButton({ showOn, onClick }: FloatingChatButtonProps) {
  const visibility =
    showOn === 'tablet-only'
      ? 'flex xl:hidden'
      : 'flex'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open chat with Buddy"
      className={cn(
        'fixed bottom-5 right-5 z-30 items-center gap-2 pl-2 pr-4 py-2 bg-white rounded-full shadow-card-hover border border-gray-200',
        'hover:scale-105 motion-reduce:hover:scale-100 hover:shadow-gold-glow transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
        visibility,
      )}
    >
      <BuddyAvatar size="sm" state="idle" />
      <span className="text-sm font-semibold text-night pr-1">Ask Buddy</span>
    </button>
  )
}
