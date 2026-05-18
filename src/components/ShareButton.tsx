'use client'

/**
 * ShareButton — generates a public share link for a trip and copies it
 * to the clipboard.
 *
 * D.9 a11y: added `type="button"`, focus-visible ring, and an
 * aria-live polite region so screen readers announce when the link
 * has been copied.
 */

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  tripId: string
}

export default function ShareButton({ tripId }: Props) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  async function share() {
    setLoading(true)

    const { data: existing } = await supabase
      .from('share_links')
      .select('short_code')
      .eq('trip_id', tripId)
      .eq('share_type', 'link')
      .maybeSingle()

    let code = existing?.short_code

    if (!code) {
      code = Math.random().toString(36).slice(2, 9)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: created } = await supabase
          .from('share_links')
          .insert({ trip_id: tripId, created_by: user.id, share_type: 'link', short_code: code })
          .select('short_code')
          .single()
        code = created?.short_code ?? code
      }
    }

    const url = `${window.location.origin}/share/${code}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setLoading(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        disabled={loading}
        aria-label={copied ? 'Trip link copied to clipboard' : 'Share trip — generates a public link and copies it'}
        className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-50 transition-colors disabled:opacity-50 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">{copied ? 'Copied!' : loading ? 'Generating...' : 'Share'}</span>
      </button>
      {/* Screen-reader-only live region announces copy success */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Share link copied to clipboard' : ''}
      </span>
    </>
  )
}
