import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard'
import AnalyticsIdentify from '@/components/AnalyticsIdentify'

/**
 * (dashboard) — authenticated layout group.
 *
 * Wraps every authenticated route inside the group with a single
 * <DashboardShell> instance. Routes inside the group:
 *   - /dashboard          → src/app/(dashboard)/dashboard/page.tsx
 *   - /trip/[id]          → src/app/(dashboard)/trip/[id]/page.tsx
 *   - (future) /trip      → trip index
 *   - (future) /explore
 *   - (future) /profile
 *
 * Why a route group (C.1):
 *   Pre-C.1, each authenticated route imported <DashboardShell> directly.
 *   Navigating between routes unmounted the shell and lost chat state
 *   (open thread, scroll position, draft text, transient avatar state).
 *
 *   With this layout, Next.js keeps the layout component instance alive
 *   as the user navigates between sibling routes. <DashboardShell>'s
 *   children (the page) re-render, but the shell itself — including the
 *   nested <ChatPanel> — persists. Chat state survives navigation.
 *
 * Routes intentionally OUTSIDE the group:
 *   - /dashboard/chat        Full-screen standalone chat (no shell)
 *   - /login, /signup        Auth pages
 *   - /onboarding            Onboarding flow has its own layout
 *
 * Auth: this layout enforces authentication. Unauthenticated requests
 * redirect to /login. Individual pages inside the group can assume
 * `user` exists when their own server logic runs (they re-fetch for
 * type safety; Next.js / Supabase dedupe identical fetches per request).
 *
 * Onboarding gate: users who haven't completed onboarding are sent
 * there. Previously this check lived in /dashboard/page.tsx — moving it
 * here means /trip/[id] etc. also enforce the same gate, which prevents
 * users from deep-linking into a trip page before finishing setup.
 */
export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed, display_name')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) redirect('/onboarding')

  return (
    <>
      <AnalyticsIdentify
        userId={user.id}
        email={user.email ?? undefined}
        displayName={profile?.display_name ?? undefined}
      />
      <DashboardShell
        userEmail={user.email ?? undefined}
        displayName={profile?.display_name ?? undefined}
      >
        {children}
      </DashboardShell>
    </>
  )
}
