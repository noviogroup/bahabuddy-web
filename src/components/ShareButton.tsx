'use client'

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
    <button
      onClick={share}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50 shrink-0"
    >
      {copied ? '✓ Copied!' : loading ? 'Generating...' : '🔗 Share'}
    </button>
  )
}
