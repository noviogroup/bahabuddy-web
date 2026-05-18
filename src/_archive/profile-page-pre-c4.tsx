import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from '@/components/ProfileForm'
import { BahaLogo } from '@/components/ui'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Profile | Baha Buddy',
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/profile')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, email, avatar_url, party_type, party_size, city, country, interest_tags, dietary_needs, accessibility_needs')
    .eq('id', user.id)
    .single()

  const safeProfile = {
    display_name: profile?.display_name ?? '',
    email: profile?.email ?? user.email ?? '',
    avatar_url: profile?.avatar_url ?? null,
    party_type: profile?.party_type ?? 'solo',
    party_size: profile?.party_size ?? 1,
    city: profile?.city ?? null,
    country: profile?.country ?? null,
    interest_tags: profile?.interest_tags ?? [],
    dietary_needs: profile?.dietary_needs ?? [],
    accessibility_needs: profile?.accessibility_needs ?? [],
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 flex-1">Profile</h1>
          <BahaLogo href="/" size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <ProfileForm profile={safeProfile} userEmail={user.email ?? ''} />
      </main>
    </div>
  )
}
