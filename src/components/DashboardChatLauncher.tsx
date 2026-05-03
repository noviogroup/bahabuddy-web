'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ChatWidget from './ChatWidget'

function Launcher() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? undefined
  return <ChatWidget initialQuery={q} />
}

export default function DashboardChatLauncher() {
  return (
    <Suspense fallback={<ChatWidget />}>
      <Launcher />
    </Suspense>
  )
}
