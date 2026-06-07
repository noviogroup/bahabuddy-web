import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import OnboardingFlow from '@/components/OnboardingFlow'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Welcome to Baha Buddy',
  description: 'Set up your travel preferences to get personalized Bahamas recommendations.',
  robots: { index: false },
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If onboarding already done, skip to dashboard
  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) redirect('/dashboard')

  // Pre-fill Screen 2 from any of:
  //   - the row in `users` (if the signup trigger has populated it)
  //   - user_metadata.display_name (set when password/magic-link signup
  //     captured a name on /login)
  //   - user_metadata.full_name first token (set by Google/Apple SSO)
  const defaultName =
    profile?.display_name ??
    user.user_metadata?.display_name ??
    user.user_metadata?.full_name?.split(' ')[0] ??
    ''

  return <OnboardingFlow userId={user.id} defaultName={defaultName} />
}
