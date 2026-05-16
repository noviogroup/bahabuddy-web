import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import ChatPage from '@/components/ChatPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Chat with Baha Buddy',
  description: 'Your personal AI travel guide for the Bahamas',
}

async function ChatPageWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ChatPage userEmail={user.email ?? ''} />
}

export default function ChatRoute() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌊</div>
          <p className="text-gray-400 text-sm">Loading Baha Buddy…</p>
        </div>
      </div>
    }>
      <ChatPageWrapper />
    </Suspense>
  )
}
