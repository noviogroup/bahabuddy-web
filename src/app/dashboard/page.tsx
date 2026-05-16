import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Trip } from '@/types/database'
import SignOutButton from '@/components/SignOutButton'

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusColor(status: Trip['status']) {
  const map: Record<Trip['status'], string> = {
    draft: 'bg-gray-100 text-gray-600',
    planned: 'bg-brand-100 text-brand-700',
    booked: 'bg-green-100 text-green-700',
    active: 'bg-brand-100 text-brand-700',
    completed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Redirect new users to onboarding
  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()
  if (profile && !profile.onboarding_completed) redirect('/onboarding')

  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const tripList = (trips ?? []) as Trip[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-900">Baha Buddy</Link>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              title="Profile"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden md:block">{user.email}</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero: Chat CTA */}
        <Link
          href="/dashboard/chat"
          className="block mb-10 bg-white border border-gray-200 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow group"
        >
          <div className="text-5xl mb-3">🌊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-brand-700 transition-colors">
            Chat with Baha Buddy
          </h1>
          <p className="text-gray-500 text-sm mb-5 max-w-md mx-auto">
            Tell me about your dream Bahamas trip and I&apos;ll plan it for you.
          </p>
          <div className="inline-flex items-center gap-2 bg-brand-600 group-hover:bg-brand-700 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Start a conversation
          </div>
        </Link>

        {/* Trips section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700">Trips Buddy planned for you</h2>
        </div>

        {tripList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <h3 className="text-base font-semibold text-gray-700 mb-2">No trips yet</h3>
            <p className="text-gray-500 text-sm mb-5">
              Start a conversation with Buddy — he will plan your trip.
            </p>
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Chat with Buddy
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tripList.map(trip => (
              <Link
                key={trip.id}
                href={`/trip/${trip.id}`}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
              >
                {trip.hero_image_url && (
                  <div className="h-32 rounded-xl overflow-hidden mb-4 bg-brand-50">
                    <img
                      src={trip.hero_image_url}
                      alt={trip.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors line-clamp-1">
                    {trip.name}
                  </h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor(trip.status)}`}>
                    {trip.status}
                  </span>
                </div>

                {(trip.date_start || trip.date_end) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(trip.date_start)}
                    {trip.date_end && ` → ${formatDate(trip.date_end)}`}
                  </p>
                )}

                {trip.islands && trip.islands.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {trip.islands.slice(0, 3).map(island => (
                      <span key={island} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                        {island}
                      </span>
                    ))}
                    {trip.islands.length > 3 && (
                      <span className="text-xs text-gray-400">+{trip.islands.length - 3} more</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  <span>👥 {trip.party_size} {trip.party_type}</span>
                  {trip.budget_estimate && (
                    <span>💰 ${trip.budget_estimate.toLocaleString()}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
