'use client'

import { useEffect, useState } from 'react'

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

interface ConversationSidebarProps {
  activeId: string | null
  onSelect: (conv: Conversation) => void
  onNew: () => void
}

const STORAGE_KEY = 'bb_conversations'

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Conversation[]
  } catch {
    return []
  }
}

export function saveConversations(convs: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs))
  } catch {
    // storage unavailable
  }
}

function formatRelative(ts: number): string {
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

export default function ConversationSidebar({ activeId, onSelect, onNew }: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    const load = () => setConversations(loadConversations().sort((a, b) => b.updatedAt - a.updatedAt))
    load()

    const handler = () => load()
    window.addEventListener('bb_conversations_updated', handler)
    return () => window.removeEventListener('bb_conversations_updated', handler)
  }, [])

  return (
    <aside className="w-64 bg-gray-900 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-500 text-xs">No conversations yet</p>
            <p className="text-gray-600 text-xs mt-1">Start chatting to see history here</p>
          </div>
        ) : (
          <ul>
            {conversations.map(conv => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelect(conv)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors group ${
                    activeId === conv.id ? 'bg-gray-800 border-l-2 border-brand-500' : ''
                  }`}
                >
                  <p className={`text-sm font-medium truncate ${
                    activeId === conv.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {conv.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <span>{formatRelative(conv.updatedAt)}</span>
                    <span>·</span>
                    <span>{conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}</span>
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-600 text-center">
          Powered by Claude AI
        </p>
      </div>
    </aside>
  )
}
