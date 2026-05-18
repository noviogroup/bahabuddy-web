'use client'

/**
 * SignOutButton — signs the current user out and redirects to landing.
 *
 * D.9 a11y: added explicit `type="button"` and a focus-visible ring.
 */

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="text-sm text-gray-500 hover:text-gray-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 px-1"
    >
      Sign out
    </button>
  )
}
