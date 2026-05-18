'use client'

/**
 * ChatPage — thin wrapper around <ChatPanel mode="standalone">.
 *
 * All chat logic now lives in /components/dashboard/ChatPanel.tsx so the
 * dashboard's right-rail (docked) and the /dashboard/chat full-page route
 * share a single implementation.
 *
 * This file exists for backwards-compat with the existing /dashboard/chat
 * page route. Delete in a future cleanup if the route is migrated to import
 * ChatPanel directly.
 */

import ChatPanel from '@/components/dashboard/ChatPanel'

interface ChatPageProps {
  userEmail: string
}

export default function ChatPage({ userEmail }: ChatPageProps) {
  return <ChatPanel mode="standalone" userEmail={userEmail} />
}
