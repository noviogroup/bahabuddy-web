'use client'

/**
 * InviteCompanions — disclosure button + panel that generates a
 * read-only invite link for travel companions.
 *
 * D.9 a11y:
 *   - Toggle button: `type="button"`, `aria-expanded`, `aria-controls`
 *   - Panel: stable `id` (referenced by aria-controls), region semantics
 *   - All buttons: `type="button"` + focus-visible rings
 *   - Status messages: aria-live="polite" for the screen reader
 *   - Read-only URL input: `aria-readonly` (visual readonly already set)
 */

import { useId, useState } from 'react'

interface Props {
  tripId: string
}

export default function InviteCompanions({ tripId }: Props) {
  const panelId = useId()

  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [revoked, setRevoked] = useState(false)

  async function generateLink() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/trips/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to generate invite')
      }
      const { code } = await res.json()
      setLink(`${window.location.origin}/share/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate invite')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function revokeLink() {
    if (!confirm('Revoke all invite links? Companions with existing links will lose access.')) return
    setRevoking(true)
    try {
      await fetch(`/api/trips/invite?tripId=${tripId}`, { method: 'DELETE' })
      setLink(null)
      setRevoked(true)
      setTimeout(() => setRevoked(false), 3000)
    } catch {
      setError('Failed to revoke invite')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          if (!open && !link) void generateLink()
        }}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close invite companions panel' : 'Invite travel companions'}
        className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
      >
        <span>Invite</span>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Invite companions"
          className="mt-3 p-4 bg-white rounded-2xl border border-purple-100 shadow-sm"
        >
          <h3 className="text-sm font-bold text-gray-900 mb-1">Invite companions</h3>
          <p className="text-xs text-gray-500 mb-3">
            Share this link so travel companions can view your full trip itinerary, flights, and hotels. Read-only access.
          </p>

          {loading && (
            <div className="text-sm text-gray-400 animate-pulse motion-reduce:animate-none" role="status" aria-live="polite">
              Generating link…
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 mb-2" role="alert">{error}</div>
          )}

          {revoked && (
            <div className="text-sm text-green-600 mb-2" role="status" aria-live="polite">
              Invite link revoked.
            </div>
          )}

          {link && !revoked && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="sr-only" htmlFor={`${panelId}-url`}>Invite link URL</label>
                <input
                  id={`${panelId}-url`}
                  type="text"
                  readOnly
                  aria-readonly="true"
                  value={link}
                  className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label={copied ? 'Invite link copied to clipboard' : 'Copy invite link to clipboard'}
                  className="shrink-0 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Live region so screen readers announce copy success */}
              <span role="status" aria-live="polite" className="sr-only">
                {copied ? 'Invite link copied to clipboard' : ''}
              </span>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Valid for 30 days · read-only</p>
                <button
                  type="button"
                  onClick={revokeLink}
                  disabled={revoking}
                  aria-label="Revoke all invite links for this trip"
                  className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 px-1"
                >
                  {revoking ? 'Revoking…' : 'Revoke link'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
