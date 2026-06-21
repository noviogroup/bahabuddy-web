'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import PublicHeader from '@/components/PublicHeader'
import { createClient } from '@/lib/supabase/client'

const HIDDEN_PREFIXES = [
  '/dashboard',
  '/profile',
  '/trip',
  '/login',
  '/share',
  '/api',
]

export default function GlobalPublicHeader() {
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUserEmail(data.user?.email ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUserEmail(session?.user?.email ?? null)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (!pathname) return null

  // Homepage has its own photo-overlay hero navigation.
  if (pathname === '/') return null

  // Dashboard, profile, login, and API routes should not show the public marketing header.
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null

  return <PublicHeader userEmail={userEmail} authLoading={authLoading} activePath={pathname} />
}
