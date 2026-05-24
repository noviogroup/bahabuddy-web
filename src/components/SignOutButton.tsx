'use client'

/**
 * SignOutButton — signs the current user out and redirects to landing.
 *
 * D.9 a11y: added explicit `type="button"` and a focus-visible ring.
 */

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { reset } from '@/lib/analytics'

export default function SignOutButton() {
  const supabase = createClient()
  const [pending, setPending] = useState(false)

  async function signOut() {
    if (pending) return
    setPending(true)
    try {
      reset()
      await supabase.auth.signOut()
      // Full navigation avoids stale RSC/webpack chunks after leaving the dashboard shell.
      window.location.assign('/')
    } catch {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="text-sm text-gray-500 hover:text-gray-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 px-1 disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
