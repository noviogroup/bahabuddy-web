'use client'

import { useEffect, useRef } from 'react'
import { identify } from '@/lib/analytics'

interface Props {
  userId: string
  email?: string
  displayName?: string
}

export default function AnalyticsIdentify({ userId, email, displayName }: Props) {
  const identified = useRef(false)

  useEffect(() => {
    if (identified.current) return
    identified.current = true
    identify(userId, { $email: email, $name: displayName })
  }, [userId, email, displayName])

  return null
}
