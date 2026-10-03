'use client'

import { useEffect, useRef } from 'react'
import { identify } from '@/lib/analytics'

interface Props {
  userId: string
  /**
   * @deprecated Ignored. Email and display name are no longer sent to
   * Mixpanel People (PII minimisation); kept so existing callers compile.
   */
  email?: string
  /** @deprecated Ignored — see `email`. */
  displayName?: string
}

export default function AnalyticsIdentify({ userId }: Props) {
  const identifiedAs = useRef<string | null>(null)

  useEffect(() => {
    if (identifiedAs.current === userId) return
    identifiedAs.current = userId
    identify(userId)
  }, [userId])

  return null
}
