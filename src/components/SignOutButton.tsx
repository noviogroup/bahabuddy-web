'use client'

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
      onClick={signOut}
      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
    >
      Sign out
    </button>
  )
}
