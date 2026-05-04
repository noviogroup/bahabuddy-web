import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import SignOutButton from '@/components/SignOutButton'
import TripBuilder from '@/components/TripBuilder'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Plan a Trip — Baha Buddy',
}

export default async function NewTripPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
              ← My Trips
            </Link>
            <span className="text-gray-200">|</span>
            <Link href="/" className="text-sm font-bold text-brand-900">Baha Buddy</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <TripBuilder />
    </div>
  )
}
