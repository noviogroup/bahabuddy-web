'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { BuddyAvatar } from '@/components/ui'
import { RichCardRenderer, parseCardsFromContent, type CardData } from './RichCards'

interface Message {
  role: 'user' | 'assistant'
  content: string
  cards?: CardData[]
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
          tripContext,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Failed to connect')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

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
            if (parsed.type === 'text_delta') {
              fullText += parsed.delta
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: fullText }
                return updated
              })
            } else if (parsed.type === 'done') {
              const { text, cards } = parseCardsFromContent(fullText)
              if (cards.length > 0) {
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: text, cards }
                  return updated
                })
              }
            }
          } catch {
            // skip malformed lines
          }
        }
      }
      // Final parse if done event was missed
      if (fullText) {
        const { text, cards } = parseCardsFromContent(fullText)
        if (cards.length > 0) {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (!last.cards) {
              updated[updated.length - 1] = { role: 'assistant', content: text, cards }
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

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 ${
          open ? 'bg-night hover:bg-gray-900 text-white' : 'bg-white border border-gray-200 hover:shadow-md p-0.5'
        }`}
        aria-label={open ? 'Close chat' : 'Chat with Baha Buddy'}
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
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {/* Header */}
          <div className="border-b border-gray-100 bg-white px-4 py-3 flex items-center gap-3">
            <BuddyAvatar size="sm" state="idle" className="shrink-0 ring-1 ring-gray-200" />
            <div>
              <p className="text-night font-semibold text-sm leading-tight">Baha Buddy</p>
              <p className="text-gray-500 text-xs">Your Bahamas travel guide</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-night text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                  {msg.role === 'assistant' && loading && i === messages.length - 1 && msg.content === '' && (
                    <span className="inline-flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
                {msg.role === 'assistant' && msg.cards && msg.cards.length > 0 && (
                  <div className="w-full max-w-[95%] mt-1">
                    {msg.cards.map((card, ci) => (
                      <RichCardRenderer key={ci} cardData={card} onSendMessage={(q) => sendQuery(q)} />
                    ))}
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
            <textarea
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
              aria-label="Send"
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
