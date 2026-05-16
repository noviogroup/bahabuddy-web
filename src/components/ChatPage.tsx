'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RichCardRenderer, parseCardsFromContent, type CardData } from './RichCards'
import ConversationSidebar, { type Conversation } from './ConversationSidebar'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
  cards?: CardData[]
}

const GREETING: Message = {
  role: 'assistant',
  content: "Hey there! I'm Baha Buddy 🌊 Your personal Bahamas travel guide. Ask me anything — best islands, where to eat, things to do, or help planning your trip!",
}

const SUGGESTED_PROMPTS = [
  'Best islands for snorkeling?',
  'When should I visit?',
  'Top things to do in Nassau',
  'Family-friendly resorts in Exuma',
]

interface ChatPageProps {
  userEmail: string
}

export default function ChatPage({ userEmail }: ChatPageProps) {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [threads, setThreads] = useState<Conversation[]>([])
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-fill input from ?q= param
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setInput(q)
  }, [searchParams])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load threads from Supabase on mount
  const loadThreads = useCallback(async () => {
    const { data } = await supabase
      .from('chat_threads')
      .select('id, title, last_message_preview, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50)
    if (data) setThreads(data as Conversation[])
    setThreadsLoading(false)
  }, [supabase])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  const startNewConversation = useCallback(() => {
    setActiveThreadId(null)
    setMessages([GREETING])
    setInput('')
    abortRef.current?.abort()
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const selectConversation = useCallback(async (conv: Conversation) => {
    setActiveThreadId(conv.id)
    setMessages([GREETING]) // show greeting while loading

    const { data: rows } = await supabase
      .from('chat_messages')
      .select('role, content, card_data')
      .eq('thread_id', conv.id)
      .order('created_at', { ascending: true })

    if (rows && rows.length > 0) {
      const loaded: Message[] = rows.map(row => ({
        role: row.role as 'user' | 'assistant',
        content: row.content,
        cards: row.card_data ? (row.card_data as CardData[]) : undefined,
      }))
      setMessages(loaded)
    } else {
      setMessages([GREETING])
    }
    setInput('')
  }, [supabase])

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
          threadId: activeThreadId,
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
            if (parsed.type === 'thread_id') {
              // New thread was created server-side — track it and refresh sidebar
              setActiveThreadId(parsed.threadId)
              loadThreads()
            } else if (parsed.type === 'text_delta') {
              fullText += parsed.delta
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: fullText }
                return updated
              })
            } else if (parsed.type === 'done') {
              const { text: cleanText, cards } = parseCardsFromContent(fullText)
              if (cards.length > 0) {
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: cleanText, cards: cards as CardData[] }
                  return updated
                })
              }
              // Refresh threads to update preview/timestamp in sidebar
              loadThreads()
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      // Final parse in case done event was missed
      if (fullText) {
        const { text: cleanText, cards } = parseCardsFromContent(fullText)
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (!last.cards && cards.length > 0) {
            updated[updated.length - 1] = { role: 'assistant', content: cleanText, cards: cards as CardData[] }
          }
          return updated
        })
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
  }, [loading, messages, activeThreadId, loadThreads])

  const sendMessage = useCallback(() => sendQuery(input), [input, sendQuery])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isNewChat = messages.length === 1 && messages[0].role === 'assistant'

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <ConversationSidebar
          conversations={threads}
          loading={threadsLoading}
          activeId={activeThreadId}
          onSelect={selectConversation}
          onNew={startNewConversation}
        />
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">🌊</span>
            <span className="text-white font-semibold text-sm">Baha Buddy</span>
            <span className="text-gray-500 text-xs hidden sm:block">· Your Bahamas travel guide</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs hidden md:block">{userEmail}</span>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white text-xs transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:block">Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {isNewChat ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="text-5xl mb-4">🌊</div>
              <h1 className="text-2xl font-bold text-white mb-2">Baha Buddy</h1>
              <p className="text-gray-400 text-sm max-w-md mb-8">
                Your personal AI travel guide for the Bahamas. Ask me about islands, restaurants, activities, or let me help plan your perfect trip.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendQuery(prompt)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-4 py-3 rounded-xl text-left transition-colors border border-gray-700 hover:border-gray-600"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">🌊</span>
                      <span className="text-xs font-medium text-gray-400">Baha Buddy</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : 'bg-gray-800 text-gray-100 rounded-bl-sm'
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
                    <div className="w-full max-w-[90%] mt-2">
                      {msg.cards.map((card, ci) => (
                        <RichCardRenderer key={ci} cardData={card} onSendMessage={sendQuery} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="bg-gray-900 border-t border-gray-700 px-4 py-4 shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about the Bahamas…"
                rows={1}
                className="w-full resize-none bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent leading-relaxed"
                style={{ maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              aria-label="Send"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-center text-gray-600 text-xs mt-2">
            Baha Buddy may make mistakes. Verify important travel info.
          </p>
        </div>
      </div>
    </div>
  )
}
