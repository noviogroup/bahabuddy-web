'use client'

import { useId, useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { BuddyAvatar } from '@/components/ui'
import type { CardData } from './RichCards'
import { stripCardFences } from '@/lib/chat-utils'
import { CHAT_FALLBACK_ERROR, chatErrorFromResponse, chatHistoryForRequest, readChatStream } from '@/lib/chat-sse'

// Rich cards are only needed once the chat has replied; load them lazily so
// the ~20 public pages that mount this widget don't ship every card up front.
const RichCardRenderer = dynamic(
  () => import('./RichCards').then(m => m.RichCardRenderer),
  { ssr: false, loading: () => null },
)

interface Message {
  role: 'user' | 'assistant'
  content: string
  cards?: CardData[]
  id?: string
  feedback?: 'helpful' | 'not_helpful'
  savedTripId?: string
}

interface TripContext {
  name?: string
  islands?: string[]
  date_start?: string
  date_end?: string
}

interface ChatWidgetProps {
  tripContext?: TripContext
  initialQuery?: string
}

export default function ChatWidget({ tripContext, initialQuery }: ChatWidgetProps) {
  const [open, setOpen] = useState(!!initialQuery)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const didAutoSend = useRef(false)
  const threadIdRef = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const panelId = useId()
  const inputId = useId()

  // Abort any in-flight reply on unmount so the server can stop too.
  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hey there! I'm Baha Buddy. Your personal Bahamas travel guide. Ask me anything — best islands, where to eat, things to do, or help planning your trip!",
      }])
    }
  }, [open, messages.length])

  // When greeting appears and we have an initialQuery, auto-send it
  useEffect(() => {
    if (initialQuery && messages.length === 1 && !didAutoSend.current) {
      didAutoSend.current = true
      const timer = setTimeout(() => {
        sendQuery(initialQuery)
      }, 400)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, initialQuery])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const sendQuery = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setLoading(true)
    setAnnouncement('')

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...newHistory, assistantMsg])

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const isCurrent = () => abortRef.current === controller && !controller.signal.aborted

    const setLastAssistant = (patch: Partial<Message>) => {
      if (!isCurrent()) return
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], role: 'assistant', ...patch }
        return updated
      })
    }

    const draftTripId = [...messages].reverse().find(m => m.savedTripId)?.savedTripId

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: chatHistoryForRequest(messages),
          tripContext,
          // Keep signed-in widget chats in one thread instead of one per message.
          threadId: threadIdRef.current ?? undefined,
          draftTripId,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const errorText = res.ok ? CHAT_FALLBACK_ERROR : await chatErrorFromResponse(res)
        setLastAssistant({ content: errorText })
        if (isCurrent()) setAnnouncement(errorText)
        return
      }

      // The server's `cards` event is the complete list (tool cards plus
      // filtered synthesized cards); never re-parse fences client-side.
      let serverCards: CardData[] = []

      const result = await readChatStream<CardData>(res.body, {
        onThreadId: id => { threadIdRef.current = id },
        onText: fullText => setLastAssistant({ content: fullText }),
        onCards: cards => { serverCards = cards },
        onDone: ({ text: finalText, tripId, assistantMessageId }) => {
          const cleanText = stripCardFences(finalText)
          setLastAssistant({
            content: cleanText,
            cards: serverCards.length > 0 ? serverCards : undefined,
            id: assistantMessageId,
            savedTripId: tripId,
          })
          setAnnouncement(`Baha Buddy replied: ${cleanText}`)
        },
        onError: errorMessage => {
          setLastAssistant({ content: errorMessage, cards: undefined })
          setAnnouncement(errorMessage)
        },
      }, isCurrent)

      // Stream ended without `done`/`error` (connection cut).
      if (isCurrent() && !result.sawDone && !result.sawError) {
        const content = stripCardFences(result.text) || CHAT_FALLBACK_ERROR
        setLastAssistant({ content, cards: serverCards.length > 0 ? serverCards : undefined })
        setAnnouncement(content)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setLastAssistant({ content: CHAT_FALLBACK_ERROR })
      if (isCurrent()) setAnnouncement(CHAT_FALLBACK_ERROR)
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [loading, messages, tripContext])

  const sendMessage = useCallback(() => {
    sendQuery(input)
  }, [input, sendQuery])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const submitFeedback = async (index: number, rating: 'helpful' | 'not_helpful') => {
    const message = messages[index]
    if (!message?.id || message.feedback) return
    const response = await fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: message.id, rating }),
    })
    if (!response.ok) return
    setMessages(current => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, feedback: rating } : item,
    ))
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 ${open ? 'flex' : 'hidden sm:flex'} ${
          open ? 'bg-night hover:bg-gray-900 text-white' : 'bg-white border border-gray-200 hover:shadow-md p-0.5'
        }`}
        aria-label={open ? 'Close chat' : 'Chat with Baha Buddy'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <BuddyAvatar size="sm" state="idle" className="!w-12 !h-12" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Chat with Baha Buddy"
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {/* Header */}
          <div className="border-b border-gray-100 bg-white px-4 py-3 flex items-center gap-3">
            <BuddyAvatar size="sm" state="idle" className="shrink-0 ring-1 ring-gray-200" />
            <div>
              <p className="text-night font-semibold text-sm leading-tight">Baha Buddy</p>
              <p className="text-gray-500 text-xs">Your Bahamas travel guide</p>
            </div>
          </div>

          {/* Completed replies are announced once; the log is not live so
              streaming deltas are not read out piecemeal. */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

          {/* Messages */}
          <div
            role="log"
            aria-live="off"
            aria-busy={loading}
            aria-label="Conversation with Baha Buddy"
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-night text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                  {msg.role === 'assistant' && loading && i === messages.length - 1 && msg.content === '' && (
                    <span className="text-xs font-semibold text-gray-500">
                      Buddy is thinking
                    </span>
                  )}
                </div>
                {msg.role === 'assistant' && msg.cards && msg.cards.length > 0 && (
                  <div className="w-full max-w-[95%] mt-1">
                    {msg.cards.map((card, ci) => (
                      <RichCardRenderer key={ci} cardData={card} onSendMessage={(q) => sendQuery(q)} tripId={msg.savedTripId} />
                    ))}
                  </div>
                )}
                {msg.role === 'assistant' && msg.id && !loading && (
                  <div className="mt-1 flex items-center gap-1 pl-1 text-xs text-gray-500">
                    <span>Was this helpful?</span>
                    <button type="button" onClick={() => submitFeedback(i, 'helpful')} disabled={Boolean(msg.feedback)} className={`rounded px-1.5 py-0.5 hover:bg-gray-100 disabled:cursor-default ${msg.feedback === 'helpful' ? 'bg-gray-100 font-semibold text-night' : ''}`}>Yes</button>
                    <button type="button" onClick={() => submitFeedback(i, 'not_helpful')} disabled={Boolean(msg.feedback)} className={`rounded px-1.5 py-0.5 hover:bg-gray-100 disabled:cursor-default ${msg.feedback === 'not_helpful' ? 'bg-gray-100 font-semibold text-night' : ''}`}>No</button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts (shown only when just the greeting is visible) */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {['Best islands for snorkeling?', 'When should I visit?', 'Top things to do in Nassau'].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendQuery(prompt)}
                  className="text-xs bg-white text-night px-2.5 py-1 rounded-full hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex items-end gap-2">
            <label htmlFor={inputId} className="sr-only">Message Baha Buddy</label>
            <textarea
              id={inputId}
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about the Bahamas…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent text-gray-800 placeholder-gray-400"
              style={{ maxHeight: '80px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-night hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
