import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trip } from '@/types/database'
import SignOutButton from '@/components/SignOutButton'
import DashboardChatLauncher from '@/components/DashboardChatLauncher'

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusColor(status: Trip['status']) {
  const map: Record<Trip['status'], string> = {
    draft: 'bg-gray-100 text-gray-600',
    planned: 'bg-blue-100 text-blue-700',
    booked: 'bg-green-100 text-green-700',
    active: 'bg-teal-100 text-teal-700',
    completed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
          <Link href="/" className="text-xl font-bold text-blue-900">Baha Buddy</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-500 text-sm mt-1">Your Bahamas travel plans, all in one place.</p>
        </div>

        {tripList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">🌊</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No trips yet</h2>
            <p className="text-gray-500 text-sm">
              Start planning on the Baha Buddy app to see your trips here.
            </p>
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
                  <div className="h-32 rounded-xl overflow-hidden mb-4 bg-blue-50">
                    <img
                      src={trip.hero_image_url}
                      alt={trip.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                    {trip.name}
                  </h2>
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
                      <span key={island} className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full">
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
      <DashboardChatLauncher />
    </div>
  )
}
