'use client'

import { useEffect, useState } from 'react'

export type FareExpiryState = {
  label: string
  isExpired: boolean
  isValid: boolean
}

export function fareExpiryState(expiration: string, nowMs: number): FareExpiryState {
  const expiresAtMs = Date.parse(expiration)
  if (!Number.isFinite(expiresAtMs)) {
    return {
      label: 'Check fare availability',
      isExpired: false,
      isValid: false,
    }
  }

  const remainingMs = expiresAtMs - nowMs
  if (remainingMs <= 0) {
    return {
      label: 'Fare expired',
      isExpired: true,
      isValid: true,
    }
  }

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const countdown = hours > 0
    ? `${hours}:${padTime(minutes)}:${padTime(seconds)}`
    : `${padTime(minutes)}:${padTime(seconds)}`

  return {
    label: `Fare expires in ${countdown}`,
    isExpired: false,
    isValid: true,
  }
}

export default function FareExpiryCountdown({ expiration }: { expiration: string }) {
  const [nowMs, setNowMs] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNowMs(Date.now())
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [expiration])

  const state = nowMs === null
    ? { label: 'Checking fare time…', isExpired: false, isValid: true }
    : fareExpiryState(expiration, nowMs)

  return (
    <span
      role="timer"
      aria-label={state.label}
      className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        state.isExpired
          ? 'bg-coral-50 text-coral-800 ring-coral-200'
          : state.isValid
            ? 'bg-gold-50 text-night ring-gold-300'
            : 'bg-gray-50 text-charcoal ring-gray-200'
      }`}
    >
      {state.label}
    </span>
  )
}

function padTime(value: number): string {
  return String(value).padStart(2, '0')
}
