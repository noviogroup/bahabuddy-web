import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import OnboardingFlow from '@/components/OnboardingFlow'
import { safeRelativePath } from '@/lib/safe-redirect'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Welcome to Baha Buddy',
  description: 'Set up your travel preferences to get personalized Bahamas recommendations.',
  robots: { index: false },
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { next?: string | string[] }
}) {
  // Where to send the user once onboarding is done (e.g. back to checkout).
  // Only same-origin relative paths survive; everything else is /dashboard.
  const rawNext = Array.isArray(searchParams?.next) ? searchParams?.next[0] : searchParams?.next
  const candidate = safeRelativePath(rawNext)
  // Never bounce back into onboarding/login (would loop once completed).
  const next = /^\/(onboarding|login)(?:[/?#]|$)/.test(candidate) ? '/dashboard' : candidate

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const onboardingPath = next === '/dashboard' ? '/onboarding' : `/onboarding?next=${encodeURIComponent(next)}`
    redirect(`/login?redirect=${encodeURIComponent(onboardingPath)}`)
  }

  // If onboarding already done, continue to the destination
  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed, display_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.onboarding_completed) redirect(next)

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

  return <OnboardingFlow userId={user.id} defaultName={defaultName} next={next} />
}
