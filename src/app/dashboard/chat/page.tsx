import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import ChatPage from '@/components/ChatPage'
import { BuddyAvatar } from '@/components/ui'

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
      <div className="flex h-screen items-center justify-center bg-offwhite">
        <div className="text-center">
          <BuddyAvatar size="lg" state="idle" className="mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading Baha Buddy…</p>
        </div>
      </div>
    }>
      <ChatPageWrapper />
    </Suspense>
  )
}
