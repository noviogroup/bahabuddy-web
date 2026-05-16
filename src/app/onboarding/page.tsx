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

  const defaultName = profile?.display_name ?? user.user_metadata?.full_name?.split(' ')[0] ?? ''

  return <OnboardingFlow userId={user.id} defaultName={defaultName} />
}
