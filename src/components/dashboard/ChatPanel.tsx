'use client'

/**
 * ChatPanel — universal chat component, mode-aware.
 *
 * Renders in two modes:
 *   - 'docked':     Embedded in the dashboard right rail. Compact header,
 *                   thread switcher as a dropdown (no sidebar), collapsible.
 *   - 'standalone': Full-screen at /dashboard/chat. Conversation sidebar
 *                   visible by default, big "welcome" hero on new chats.
 *
 * Theme: LIGHT — matches mobile chat (lib/features/chat/screens/chat_screen.dart).
 *
 * Buddy avatar state machine (B.11):
 *   loading                 → 'thinking'
 *   just saved a trip       → 'celebrating' (2s transient)
 *   just rendered cards     → 'presenting'  (1.6s transient)
 *   otherwise               → 'idle'
 *
 * Suggestion chips (B.12): adapt to the last assistant's card type via
 * getAdaptiveChips() — see src/lib/adaptive-chips.ts.
 *
 * SSE event protocol (B.16):
 *   - thread_id       → captured into activeThreadId
 *   - text_delta      → appended to streaming assistant message
 *   - tool_start      → show "Searching hotels…" pill under the message
 *   - tool_complete   → clear active tool pill
 *   - cards           → server-emitted CardData[] from tool results
 *   - done [tripId?]  → finalize: parse fence cards, merge with server cards,
 *                       trigger celebrating/presenting transient, persist
 *   - error           → show fallback message
 *
 * D.9.7 a11y:
 *   - Textarea has an associated sr-only <label> in both modes
 *   - Message list wraps in role="log" aria-live="polite" so screen
 *     readers hear new assistant messages as they arrive
 *   - Tool progress pill ("Searching hotels…") is a role="status" live
 *     region — announced when active
 *   - Thinking dots get aria-hidden + motion-reduce:animate-none
 *   - "Trip saved" success card is role="status" so the save is
 *     announced inline
 *   - All interactive buttons have type="button" + focus-visible rings
 *   - Suggested-prompt grid is a role="list" of role="listitem"
 *
 * C.9.7 wire:
 *   When a `done` event includes `tripId`, the message stores it as
 *   `savedTripId`. MessageRow threads that down to RichCardRenderer
 *   so SummaryCard can render a "Book this trip" CTA inline. The
 *   pre-existing "Trip saved · View →" success card still renders
 *   below (confirmation + action are distinct affordances).
 */

import { useId, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RichCardRenderer, parseCardsFromContent, type CardData } from '../RichCards'
import ConversationSidebar, { type Conversation } from '../ConversationSidebar'
import TripContextChips from '../trip/TripContextChips'
import { createClient } from '@/lib/supabase/client'
import { BuddyAvatar, SuggestionChip, SuggestionChipRow } from '@/components/ui'
import { getAdaptiveChips, type Chip } from '@/lib/adaptive-chips'
import type { ParsedCard } from '@/lib/chat-utils'
import { track } from '@/lib/analytics'

interface Message {
  role: 'user' | 'assistant'
  content: string
  cards?: CardData[]
  savedTripId?: string
}

const GREETING: Message = {
  role: 'assistant',
  content:
    "Hey there! I'm Baha Buddy. Your personal Bahamas travel guide — ask me anything. Best islands, where to eat, things to do, or let me plan your whole trip.",
}

const SUGGESTED_PROMPTS = [
  'Plan a 5-day trip to the Exumas',
  'Best islands for snorkeling?',
  'When should I visit?',
  'Top things to do in Nassau',
]

type BuddyTransient = 'presenting' | 'celebrating' | null

export type ChatPanelMode = 'docked' | 'standalone'

export interface ChatPanelProps {
  mode?: ChatPanelMode
  userEmail?: string
  guestMode?: boolean
  onCollapse?: () => void
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function buildTripItemPayload(card: CardData): Record<string, unknown> | null {
  const name = card.name ?? card.title ?? card.airline ?? card.route
  if (!name) return null

  if (card.card_type === 'hotel') {
    const price = card.cheapest_total ?? (card.price_per_night && card.nights ? card.price_per_night * card.nights : card.price_per_night)
    return {
      itemType: 'hotel',
      sourceId: card.place_id,
      sourceType: 'chat_card',
      name,
      island: card.island ?? card.city,
      provider: 'liteapi',
      providerHotelId: card.place_id,
      price,
      pricePerNight: card.price_per_night,
      currency: 'USD',
      imageUrl: card.photo ?? card.thumbnail ?? card.photo_url,
      metadata: {
        rating: card.rating,
        stars: card.stars,
        why: card.description,
      },
    }
  }

  if (card.card_type === 'flight') {
    const routeParts = (card.route ?? '').split(/\s+to\s+|[→>-]/i).map(part => part.trim()).filter(Boolean)
    return {
      itemType: 'flight',
      sourceId: card.duffel_offer_id ?? card.offer_id ?? card.provider_offer_id,
      sourceType: 'chat_card',
      name: card.route ?? `${card.airline ?? 'Flight'} option`,
      provider: card.offer_id || card.provider_offer_id ? 'liteapi' : card.duffel_offer_id ? 'duffel' : 'liteapi',
      providerOfferId: card.duffel_offer_id ?? card.offer_id ?? card.provider_offer_id,
      origin: routeParts[0],
      destination: routeParts[1],
      airline: card.airline,
      price: card.price,
      currency: 'USD',
      metadata: {
        departure: card.departure,
        arrival: card.arrival,
        duration: card.duration,
        stops: card.stops,
        cabin_class: card.cabin_class,
      },
    }
  }

  if (card.card_type === 'restaurant' || card.card_type === 'activity') {
    return {
      itemType: card.card_type,
      sourceId: card.place_id ?? card.product_code,
      sourceType: 'chat_card',
      name,
      island: card.island ?? card.city,
      dayNumber: card.day_number ?? 1,
      timeSlot: card.card_type === 'restaurant' ? 'evening' : 'afternoon',
      price: card.from_price ?? card.price,
      imageUrl: card.photo ?? card.thumbnail ?? card.photo_url,
      notes: card.description,
      metadata: {
        cuisine: card.cuisine ?? card.cuisine_type,
        duration: card.duration,
        rating: card.rating,
        supplier: card.supplier,
      },
    }
  }

  return null
}

export default function ChatPanel({
  mode = 'standalone',
  userEmail,
  guestMode = false,
  onCollapse,
}: ChatPanelProps) {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const isDocked = mode === 'docked'

  // Stable IDs for label/control associations.
  const textareaIdStandalone = useId()
  const textareaIdDocked = useId()

  const [threads, setThreads] = useState<Conversation[]>([])
  const [threadsLoading, setThreadsLoading] = useState(!guestMode)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [threadMenuOpen, setThreadMenuOpen] = useState(false)
  /** Active tool progress label, e.g. "Searching hotels…". Cleared on tool_complete. */
  const [activeTool, setActiveTool] = useState<string | null>(null)

  const [transient, setTransient] = useState<BuddyTransient>(null)
  const transientTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = searchParams?.get('q')
    if (q) setInput(q)
  }, [searchParams])

  /** Trip-scoped chat: when ?trip=<id> is present, render the
   *  TripContextChips strip above the message log. The chips own
   *  their own data fetch + PATCH lifecycle. */
  const tripIdParam = searchParams?.get('trip') ?? null
  const [tripContext, setTripContext] = useState<{
    id: string
    name: string
    islands: string[]
    date_start: string | null
    date_end: string | null
  } | null>(null)

  useEffect(() => {
    if (!tripIdParam || guestMode) {
      setTripContext(null)
      return
    }
    void supabase
      .from('trips')
      .select('id, name, islands, date_start, date_end')
      .eq('id', tripIdParam)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTripContext({
            id: data.id,
            name: data.name,
            islands: data.islands ?? [],
            date_start: data.date_start,
            date_end: data.date_end,
          })
        }
      })
  }, [tripIdParam, supabase, guestMode])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!threadMenuOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-thread-menu]')) setThreadMenuOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [threadMenuOpen])

  useEffect(() => {
    return () => {
      if (transientTimer.current) clearTimeout(transientTimer.current)
    }
  }, [])

  const triggerTransient = useCallback((state: BuddyTransient, durationMs: number) => {
    if (transientTimer.current) clearTimeout(transientTimer.current)
    setTransient(state)
    transientTimer.current = setTimeout(() => setTransient(null), durationMs)
  }, [])

  const loadThreads = useCallback(async () => {
    if (guestMode) {
      setThreads([])
      setActiveThreadId(null)
      setThreadsLoading(false)
      return
    }

    const { data } = await supabase
      .from('chat_threads')
      .select('id, title, last_message_preview, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50)
    if (data) setThreads(data as Conversation[])
    setThreadsLoading(false)
  }, [supabase, guestMode])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  const startNewConversation = useCallback(() => {
    setActiveThreadId(null)
    setMessages([GREETING])
    setInput('')
    setThreadMenuOpen(false)
    abortRef.current?.abort()
    setTransient(null)
    setActiveTool(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const selectConversation = useCallback(async (conv: Conversation) => {
    if (guestMode) return

    setActiveThreadId(conv.id)
    setThreadMenuOpen(false)
    setMessages([GREETING])
    setTransient(null)
    setActiveTool(null)

    const { data: rows } = await supabase
      .from('chat_messages')
      .select('role, content, card_data')
      .eq('thread_id', conv.id)
      .order('created_at', { ascending: true })

    if (rows && rows.length > 0) {
      const loaded: Message[] = rows.map((row: { role: string; content: string; card_data: unknown }) => ({
        role: row.role as 'user' | 'assistant',
        content: row.content,
        cards: row.card_data ? (row.card_data as CardData[]) : undefined,
      }))
      setMessages(loaded)
    } else {
      setMessages([GREETING])
    }
    setInput('')
  }, [supabase, guestMode])

  const sendQuery = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setLoading(true)
    setActiveTool(null)

    const sendTimestamp = Date.now()
    track('chat_message_sent', {
      message_length: text.trim().length,
      session_id: activeThreadId ?? undefined,
    })

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...newHistory, assistantMsg])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10),
          threadId: activeThreadId,
          tripContext: tripContext ?? undefined,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Failed to connect')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      // Server-emitted cards from tool results (B.16) — accumulated across the
      // turn, then merged with Claude's fence-block cards at done time.
      const serverCards: CardData[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))

            switch (parsed.type) {
              case 'thread_id':
                setActiveThreadId(parsed.threadId)
                loadThreads()
                break

              case 'text_delta':
                fullText += parsed.delta
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: fullText }
                  return updated
                })
                break

              case 'tool_start':
                // e.g. "Searching hotels…" — shown under the streaming bubble
                setActiveTool(parsed.label ?? `Using ${parsed.tool}…`)
                break

              case 'tool_complete':
                setActiveTool(null)
                break

              case 'cards':
                if (Array.isArray(parsed.cards)) {
                  serverCards.push(...(parsed.cards as CardData[]))
                }
                break

              case 'done': {
                const savedTripId: string | undefined = parsed.tripId
                // Parse fence-block cards from text (day_plan / summary / map)
                const { text: cleanText, cards: fenceCards } = parseCardsFromContent(fullText)
                // Merge: server-emitted concrete data first, then synthesized
                const combinedCards: CardData[] = [
                  ...serverCards,
                  ...(fenceCards as CardData[]),
                ]
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: cleanText,
                    cards: combinedCards.length > 0 ? combinedCards : undefined,
                    savedTripId,
                  }
                  return updated
                })
                setActiveTool(null)
                loadThreads()

                track('ai_response_received', {
                  card_count: combinedCards.length,
                  card_types: combinedCards.map(c => c.card_type),
                  response_time_ms: Date.now() - sendTimestamp,
                })

                if (savedTripId) {
                  triggerTransient('celebrating', 2000)
                } else if (combinedCards.length > 0) {
                  triggerTransient('presenting', 1600)
                }
                break
              }

              case 'error':
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: parsed.message ?? "Sorry, I couldn't connect right now. Please try again!",
                  }
                  return updated
                })
                break
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      // Defensive: if stream ended without a `done` event (rare), still attach
      // whatever we collected.
      if (fullText && serverCards.length === 0) {
        const { text: cleanText, cards } = parseCardsFromContent(fullText)
        if (cards.length > 0) {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (!last.cards) {
              updated[updated.length - 1] = { ...last, content: cleanText, cards: cards as CardData[] }
            }
            return updated
          })
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "Sorry, I couldn't connect right now. Please try again!",
        }
        return updated
      })
    } finally {
      setLoading(false)
      setActiveTool(null)
    }
  }, [loading, messages, activeThreadId, loadThreads, triggerTransient, tripContext])

  const sendMessage = useCallback(() => sendQuery(input), [input, sendQuery])

  const addCardToTrip = useCallback(async (card: CardData, tripId: string) => {
    if (guestMode) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sign in to save this to a trip. You can keep browsing and chatting as a guest.',
        },
      ])
      return
    }

    const payload = buildTripItemPayload(card)
    if (!payload) return

    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error ?? 'Could not add this to your trip.')
      }

      track('trip_item_added_from_chat_card', {
        trip_id: tripId,
        card_type: card.card_type,
        source_id: card.place_id ?? card.product_code ?? card.duffel_offer_id ?? card.offer_id,
      })

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Saved ${payload.name} to your trip.`,
        },
      ])
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Could not add this to your trip.',
        },
      ])
    }
  }, [guestMode])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isNewChat = messages.length === 1 && messages[0].role === 'assistant'

  const buddyState: 'idle' | 'thinking' | 'presenting' | 'celebrating' =
    loading ? 'thinking' : transient ?? 'idle'

  const adaptiveChips = useMemo<Chip[]>(() => {
    if (isNewChat) return []
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'assistant' && m.content) {
        return getAdaptiveChips(m.cards as ParsedCard[] | undefined)
      }
    }
    return getAdaptiveChips(undefined)
  }, [messages, isNewChat])

  const activeThread = activeThreadId ? threads.find(t => t.id === activeThreadId) : null

  // ── Render: standalone (full-screen) ─────────────────────────────────────
  if (!isDocked) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        {sidebarOpen && (
          <ConversationSidebar
            conversations={threads}
            loading={threadsLoading}
            activeId={activeThreadId}
            onSelect={selectConversation}
            onNew={startNewConversation}
            guestMode={guestMode}
          />
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(o => !o)}
              className="text-gray-400 hover:text-night transition-colors rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              aria-label={sidebarOpen ? 'Close conversation sidebar' : 'Open conversation sidebar'}
              aria-expanded={sidebarOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <BuddyAvatar size="sm" state={buddyState} />
              <div className="flex flex-col min-w-0">
                <span className="text-night font-bold text-sm leading-tight">Baha Buddy</span>
                <span className="text-gray-500 text-xs leading-tight hidden sm:block">Your Bahamas travel guide</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {userEmail && (
                <span className="text-gray-500 text-xs hidden md:block">{userEmail}</span>
              )}
              {guestMode ? (
                <Link
                  href="/login?redirect=%2Fdashboard%2Fchat"
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-night transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                >
                  Sign in to save
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-night text-xs transition-colors flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 px-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="hidden sm:block">Dashboard</span>
                </Link>
              )}
            </div>
          </header>

          {/* Trip context chips — only when ?trip=<id> is in the URL.
              Sits between the header and the message log so trip params
              stay editable while chatting. */}
          {tripIdParam && !guestMode && <TripContextChips tripId={tripIdParam} />}

          <div className="flex-1 overflow-y-auto bg-offwhite">
            {isNewChat ? (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <BuddyAvatar size="xl" state="idle" />
                <h1 className="text-2xl font-bold text-night mt-5 mb-2">Baha Buddy</h1>
                <p className="text-gray-600 text-sm max-w-md mb-8 leading-relaxed">
                  Your personal AI travel guide for the Bahamas. Ask me about islands, restaurants,
                  activities, or let me plan your perfect trip.
                </p>
                <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTED_PROMPTS.map(prompt => (
                    <li key={prompt}>
                      <button
                        type="button"
                        onClick={() => sendQuery(prompt)}
                        className="w-full bg-white hover:bg-brand-50 text-night text-sm px-4 py-3 rounded-baha-md text-left transition-colors border border-gray-200 hover:border-brand-300 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                      >
                        {prompt}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div
                role="log"
                aria-live="polite"
                aria-label="Conversation with Baha Buddy"
                className="max-w-3xl mx-auto px-4 py-6 space-y-6"
              >
                {messages.map((msg, i) => (
                  <MessageRow
                    key={i}
                    msg={msg}
                    loading={loading}
                    isLast={i === messages.length - 1}
                    activeTool={activeTool}
                    onSendMessage={sendQuery}
                    activeTripId={guestMode ? undefined : tripContext?.id ?? tripIdParam ?? undefined}
                    onAddCardToTrip={addCardToTrip}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="bg-white border-t border-gray-200 px-4 py-4 shrink-0">
            {!isNewChat && !loading && adaptiveChips.length > 0 && (
              <div className="max-w-3xl mx-auto mb-2">
                <SuggestionChipRow>
                  {adaptiveChips.map(chip => (
                    <SuggestionChip
                      key={chip.label}
                      label={chip.label}
                      onClick={() => sendQuery(chip.prompt)}
                      variant={chip.variant}
                    />
                  ))}
                </SuggestionChipRow>
              </div>
            )}
            <div className="max-w-3xl mx-auto flex items-end gap-3">
              <div className="flex-1 relative">
                <label htmlFor={textareaIdStandalone} className="sr-only">
                  Message Baha Buddy
                </label>
                <textarea
                  id={textareaIdStandalone}
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell me what you're thinking…"
                  aria-label="Message Baha Buddy"
                  rows={1}
                  className="w-full resize-none bg-gray-50 border border-gray-300 rounded-baha-md px-4 py-3 text-sm text-night placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 focus:bg-white leading-relaxed"
                  style={{ maxHeight: '120px' }}
                />
              </div>
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                aria-disabled={!input.trim() || loading}
                className="w-11 h-11 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors shrink-0 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-center text-gray-400 text-xs mt-2">
              Baha Buddy may make mistakes. Verify important travel info.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: docked (right-rail panel) ────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <header className="shrink-0 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
        <BuddyAvatar size="sm" state={buddyState} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-night leading-tight">Baha Buddy</p>
          <button
            type="button"
            onClick={() => setThreadMenuOpen(o => !o)}
            data-thread-menu
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-night transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 px-1"
            aria-haspopup="menu"
            aria-expanded={threadMenuOpen}
            aria-label="Switch conversation"
          >
            <span className="truncate max-w-[160px]">
              {activeThread?.title || activeThread?.last_message_preview || 'New conversation'}
            </span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={startNewConversation}
          title="New chat"
          aria-label="Start new conversation"
          className="text-gray-400 hover:text-brand-600 transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse chat"
            aria-label="Collapse chat panel"
            className="text-gray-400 hover:text-night transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </header>

      {threadMenuOpen && (
        <div
          data-thread-menu
          role="menu"
          aria-label="Recent conversations"
          className="absolute top-16 left-2 right-2 bg-white border border-gray-200 rounded-baha-md shadow-card-hover z-10 max-h-80 overflow-y-auto animate-slide-up motion-reduce:animate-none"
        >
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
            <button
              type="button"
              role="menuitem"
              onClick={startNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-baha-sm text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start new conversation
            </button>
          </div>
          {threadsLoading ? (
            <p className="px-4 py-6 text-xs text-gray-400 text-center" role="status">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-400 text-center">No conversations yet.</p>
          ) : (
            <ul className="py-1">
              {threads.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => selectConversation(t)}
                    aria-current={t.id === activeThreadId ? 'true' : undefined}
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-brand-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                      t.id === activeThreadId && 'bg-brand-50',
                    )}
                  >
                    <p className="text-sm text-night truncate font-medium">
                      {t.title || t.last_message_preview || 'New Chat'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Trip context chips (docked mode) — same trip-scoped affordance
          as the standalone surface, just at the docked indent depth. */}
      {tripIdParam && !guestMode && <TripContextChips tripId={tripIdParam} />}

      <div className="flex-1 overflow-y-auto bg-offwhite">
        {isNewChat ? (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            <BuddyAvatar size="lg" state="idle" />
            <h2 className="text-lg font-bold text-night mt-4 mb-1.5">Tell me what you&apos;re thinking</h2>
            <p className="text-gray-500 text-xs mb-5 leading-relaxed">
              A vibe, a dream, a rough idea — I&apos;ll figure out the rest.
            </p>
            <ul role="list" className="flex flex-col gap-2 w-full">
              {SUGGESTED_PROMPTS.map(prompt => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => sendQuery(prompt)}
                    className="w-full bg-white hover:bg-brand-50 text-night text-xs px-3 py-2.5 rounded-baha-md text-left transition-colors border border-gray-200 hover:border-brand-300 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            role="log"
            aria-live="polite"
            aria-label="Conversation with Baha Buddy"
            className="px-3 py-4 space-y-4"
          >
            {messages.map((msg, i) => (
              <MessageRow
                key={i}
                msg={msg}
                loading={loading}
                isLast={i === messages.length - 1}
                activeTool={activeTool}
                onSendMessage={sendQuery}
                compact
                activeTripId={guestMode ? undefined : tripContext?.id ?? tripIdParam ?? undefined}
                onAddCardToTrip={addCardToTrip}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 py-3 border-t border-gray-200 bg-white">
        {!isNewChat && !loading && adaptiveChips.length > 0 && (
          <div className="mb-2">
            <SuggestionChipRow>
              {adaptiveChips.map(chip => (
                <SuggestionChip
                  key={chip.label}
                  label={chip.label}
                  onClick={() => sendQuery(chip.prompt)}
                  variant={chip.variant}
                />
              ))}
            </SuggestionChipRow>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <label htmlFor={textareaIdDocked} className="sr-only">
              Message Baha Buddy
            </label>
            <textarea
              id={textareaIdDocked}
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Buddy…"
              aria-label="Message Baha Buddy"
              rows={1}
              className="w-full resize-none bg-gray-50 border border-gray-300 rounded-baha-md px-3 py-2.5 text-sm text-night placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 focus:bg-white leading-relaxed"
              style={{ maxHeight: '100px' }}
            />
          </div>
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            aria-disabled={!input.trim() || loading}
            className="w-10 h-10 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors shrink-0 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MessageRow ─────────────────────────────────────────────────────────────

interface MessageRowProps {
  msg: Message
  loading: boolean
  isLast: boolean
  /** Active tool progress label — e.g. "Searching hotels…". Only shown on the last assistant message while loading. */
  activeTool?: string | null
  onSendMessage: (msg: string) => void
  activeTripId?: string
  onAddCardToTrip?: (card: CardData, tripId: string) => void | Promise<void>
  compact?: boolean
}

function MessageRow({ msg, loading, isLast, activeTool, onSendMessage, activeTripId, onAddCardToTrip, compact }: MessageRowProps) {
  const isUser = msg.role === 'user'
  const showThinkingDots = !isUser && loading && isLast && msg.content === '' && !activeTool
  const showToolLabel = !isUser && loading && isLast && !!activeTool

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      {!isUser && (
        <div className="flex items-center gap-2 mb-1.5">
          <BuddyAvatar size="xs" />
          <span className="text-xs font-semibold text-gray-500">Baha Buddy</span>
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-user-bubble text-white rounded-baha-lg rounded-br-sm'
            : 'bg-buddy-bubble text-night rounded-baha-lg rounded-bl-sm',
          compact && 'text-[13px] px-3 py-2.5',
        )}
      >
        {msg.content}
        {showThinkingDots && (
          <span className="inline-flex gap-1 items-center h-4" aria-hidden="true">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '300ms' }} />
          </span>
        )}
        {showThinkingDots && <span className="sr-only">Buddy is thinking…</span>}
      </div>

      {/* Tool progress pill — appears under the streaming bubble while a tool runs.
          role="status" + aria-live polite so the activity is announced to screen readers. */}
      {showToolLabel && (
        <div
          role="status"
          aria-live="polite"
          className="mt-1.5 flex items-center gap-2 bg-brand-50 text-brand-700 rounded-full pl-2 pr-3 py-1 text-xs animate-fade-in motion-reduce:animate-none"
        >
          <span className="inline-flex gap-0.5 items-center" aria-hidden="true">
            <span className="w-1 h-1 bg-brand-500 rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 bg-brand-500 rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-brand-500 rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '300ms' }} />
          </span>
          <span className="font-medium">{activeTool}</span>
        </div>
      )}

      {!isUser && msg.cards && msg.cards.length > 0 && (
        <div className={cn('w-full mt-2', compact ? 'max-w-full' : 'max-w-[90%]')}>
          {msg.cards.map((card, ci) => (
            // C.9.7 wire: pass savedTripId so SummaryCard can render its
            // "Book this trip" CTA inline (other card types ignore it).
            <RichCardRenderer
              key={ci}
              cardData={card}
              onSendMessage={onSendMessage}
              activeTripId={msg.savedTripId ?? activeTripId}
              onAddToTrip={onAddCardToTrip}
              tripId={msg.savedTripId}
            />
          ))}
        </div>
      )}

      {!isUser && msg.savedTripId && (
        <div className={cn('mt-3', compact ? 'w-full' : 'w-full max-w-[90%]')}>
          <div
            role="status"
            className="bg-palm-50 border border-palm-200 rounded-baha-md px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-palm-700 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Trip saved</span>
            </div>
            <Link
              href={`/trip/${msg.savedTripId}`}
              className="shrink-0 bg-palm-500 hover:bg-palm-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-palm-300 focus-visible:ring-offset-2"
            >
              View →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
