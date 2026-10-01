import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { DashboardShell } from '@/components/dashboard'
import AnalyticsIdentify from '@/components/AnalyticsIdentify'
import { getSafeRelativePath, PATHNAME_HEADER } from '@/lib/safe-redirect'

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
 * The current path (set by middleware as x-baha-pathname) is forwarded as
 * ?next= / ?redirect= so login and onboarding return the user to where they
 * were going (e.g. checkout). A missing users row counts as not onboarded.
 */
export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentPath = getSafeRelativePath(headers().get(PATHNAME_HEADER))
  if (!user) {
    redirect(currentPath ? `/login?redirect=${encodeURIComponent(currentPath)}` : '/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('onboarding_completed, display_name')
    .eq('id', user.id)
    .maybeSingle()

  // Missing row (signup trigger failed) is treated as not onboarded; the
  // onboarding flow creates it. A transient read error does not gate.
  if (!profileError && !profile?.onboarding_completed) {
    redirect(currentPath && currentPath !== '/dashboard'
      ? `/onboarding?next=${encodeURIComponent(currentPath)}`
      : '/onboarding')
  }

  return (
    <>
      <AnalyticsIdentify userId={user.id} />
      <DashboardShell
        userEmail={user.email ?? undefined}
        displayName={profile?.display_name ?? undefined}
      >
        {children}
      </DashboardShell>
    </>
  )
}
