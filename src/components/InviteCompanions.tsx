'use client'

import { useState } from 'react'

interface Props {
  tripId: string
}

export default function InviteCompanions({ tripId }: Props) {
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
        onClick={() => {
          setOpen(!open)
          if (!open && !link) void generateLink()
        }}
        className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors"
      >
        👥 Invite
      </button>

      {open && (
        <div className="mt-3 p-4 bg-white rounded-2xl border border-purple-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Invite companions</h3>
          <p className="text-xs text-gray-500 mb-3">
            Share this link so travel companions can view your full trip itinerary, flights, and hotels. Read-only access.
          </p>

          {loading && (
            <div className="text-sm text-gray-400 animate-pulse">Generating link…</div>
          )}

          {error && (
            <div className="text-sm text-red-500 mb-2">{error}</div>
          )}

          {revoked && (
            <div className="text-sm text-green-600 mb-2">✓ Invite link revoked.</div>
          )}

          {link && !revoked && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  readOnly
                  value={link}
                  className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={copyLink}
                  className="shrink-0 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Valid for 30 days · read-only</p>
                <button
                  onClick={revokeLink}
                  disabled={revoking}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
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
