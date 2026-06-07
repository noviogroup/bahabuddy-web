'use client'

import { usePathname } from 'next/navigation'
import PublicHeader from '@/components/PublicHeader'

const HIDDEN_PREFIXES = [
  '/dashboard',
  '/profile',
  '/login',
  '/api',
]

export default function GlobalPublicHeader() {
  const pathname = usePathname()

  if (!pathname) return null

  // Homepage has its own photo-overlay hero navigation.
  if (pathname === '/') return null

  // Dashboard, profile, login, and API routes should not show the public marketing header.
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null

  return <PublicHeader />
}
