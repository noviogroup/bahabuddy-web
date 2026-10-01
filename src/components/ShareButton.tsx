'use client'

/**
 * ShareButton — gets (or creates, server-side) a public share link for a
 * trip and copies it to the clipboard.
 *
 * The link is only copied after the server confirms the share row exists,
 * and the button always leaves its loading state (try/finally), even if the
 * clipboard is unavailable.
 *
 * D.9 a11y: `type="button"`, focus-visible ring, and an aria-live polite
 * region so screen readers announce copy success or failure.
 */

import { useState } from 'react'

interface Props {
  tripId: string
}

type ShareState = 'idle' | 'loading' | 'copied' | 'error'

export default function ShareButton({ tripId }: Props) {
  const [state, setState] = useState<ShareState>('idle')
  const [message, setMessage] = useState('')
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

  async function share() {
    if (state === 'loading') return
    setState('loading')
    setMessage('')
    setFallbackUrl(null)
    let nextState: ShareState = 'error'

    try {
      const res = await fetch('/api/trips/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      const json = await res.json().catch(() => ({})) as { code?: string; error?: string }
      if (!res.ok || !json.code) {
        setMessage(json.error ?? 'Could not create a share link. Please try again.')
        return
      }

      const url = `${window.location.origin}/share/${encodeURIComponent(json.code)}`
      try {
        await navigator.clipboard.writeText(url)
        nextState = 'copied'
        setMessage('Share link copied to clipboard')
      } catch {
        // Link exists; clipboard is blocked (permissions / insecure context).
        setFallbackUrl(url)
        setMessage('Copy this link to share your trip.')
      }
    } catch {
      setMessage('Could not create a share link. Please try again.')
    } finally {
      setState(nextState)
      if (nextState === 'copied') {
        setTimeout(() => setState(current => (current === 'copied' ? 'idle' : current)), 2000)
      }
    }
  }

  const label = state === 'copied' ? 'Copied!' : state === 'loading' ? 'Generating...' : state === 'error' && !fallbackUrl ? 'Try again' : 'Share'

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={share}
        disabled={state === 'loading'}
        aria-label={state === 'copied' ? 'Trip link copied to clipboard' : 'Share trip — generates a public link and copies it'}
        className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-50 transition-colors disabled:opacity-50 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">{label}</span>
      </button>
      {fallbackUrl && (
        <input
          type="text"
          readOnly
          aria-label="Trip share link"
          value={fallbackUrl}
          onFocus={(e) => e.target.select()}
          className="w-56 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
        />
      )}
      {state === 'error' && message && !fallbackUrl && (
        <span role="alert" className="text-xs text-red-700">{message}</span>
      )}
      {/* Screen-reader-only live region announces copy success */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' || fallbackUrl ? message : ''}
      </span>
    </div>
  )
}
