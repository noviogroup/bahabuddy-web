'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { init, pageview } from '@/lib/analytics'

export default function AnalyticsProvider() {
  const pathname = usePathname()
  const prevPath = useRef<string | null>(null)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (pathname && pathname !== prevPath.current) {
      pageview(pathname)
      prevPath.current = pathname
    }
  }, [pathname])

  return null
}
