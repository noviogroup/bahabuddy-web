'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics'

interface TrackViewProps {
  event: string
  props?: Record<string, unknown>
}

export default function TrackView({ event, props }: TrackViewProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    track(event, props)
  }, [event, props])

  return null
}
