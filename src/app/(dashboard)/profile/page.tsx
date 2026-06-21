import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import SignOutButton from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

/**
 * /profile — Account + travel preferences (Phase C.4 per UI/UX Spec §8).
 *
 * Layout:
 *   1. Page header — "Profile" + brief description
 *   2. Account card  — email (read-only), member since, sign out
 *   3. <ProfileForm /> — editable travel preferences with sticky save bar
 *
 * The form sections cover:
 *   - About you (display name, city, country)
 *   - How you travel (party type, party size, children)
 *   - What gets you excited (interest tags)
 *
 * Auth gate: handled by the (dashboard) route group layout.
 *
 * Out of scope for C.4 (queue for D polish):
 *   - Dietary needs / accessibility needs
 *   - Notification preferences
 *   - Voice settings
 *   - Email change / password change / delete account
 */

function fmtMemberSince(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, city, country, party_type, party_size, children_count, interest_tags, created_at')
    .eq('id', user.id)
    .single()

  const initial = {
    display_name:   profile?.display_name ?? '',
    city:           profile?.city ?? '',
    country:        profile?.country ?? '',
    party_type:     profile?.party_type ?? 'solo',
    party_size:     profile?.party_size ?? 1,
    children_count: profile?.children_count ?? 0,
    interest_tags:  (profile?.interest_tags as string[] | null) ?? [],
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-night">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          The more Buddy knows, the better the recommendations.
        </p>
      </div>

      {/* Account card — email + member since + sign out */}
      <section className="mb-8 bg-white rounded-baha-md border border-gray-200 p-5 shadow-soft">
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-full bg-gray-100 text-night flex items-center justify-center font-bold text-base">
              {(profile?.display_name || user.email || '?').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              {profile?.display_name && (
                <p className="font-bold text-night truncate">{profile.display_name}</p>
              )}
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Member since {fmtMemberSince(profile?.created_at ?? user.created_at)}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </section>

      {/* Editable preferences */}
      <ProfileForm initial={initial} />
    </main>
  )
}
