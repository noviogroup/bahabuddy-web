import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalyticsIdentify from '@/components/AnalyticsIdentify'
import { DashboardShell } from '@/components/dashboard'
import CreateTripPageClient from '@/components/trip/CreateTripPageClient'
import { getIslandConfig } from '@/lib/island-config'

export const dynamic = 'force-dynamic'

interface NewTripPageProps {
  searchParams?: {
    returnTo?: string
    source?: string
    seed?: string
    destination?: string
  }
}

function getSafeReturnTo(value?: string): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  if (value.startsWith('/api')) return null
  return value
}

function getSafeSeed(value?: string): string | null {
  const clean = value?.replace(/\s+/g, ' ').trim().slice(0, 600)
  return clean || null
}

function getSafeDestination(value?: string): string | null {
  const clean = value?.replace(/\s+/g, '-').trim().toLowerCase().slice(0, 80)
  if (!clean) return null
  return getIslandConfig(clean) ? clean : null
}

function buildCurrentPath(searchParams?: NewTripPageProps['searchParams']): string {
  const params = new URLSearchParams()
  const returnTo = getSafeReturnTo(searchParams?.returnTo)
  const seed = getSafeSeed(searchParams?.seed)
  const destination = getSafeDestination(searchParams?.destination)
  if (returnTo) params.set('returnTo', returnTo)
  if (searchParams?.source) params.set('source', searchParams.source)
  if (seed) params.set('seed', seed)
  if (destination) params.set('destination', destination)

  const query = params.toString()
  return query ? `/dashboard/trips/new?${query}` : '/dashboard/trips/new'
}

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(buildCurrentPath(searchParams))}`)
  }

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
        <CreateTripPageClient
          returnTo={getSafeReturnTo(searchParams?.returnTo)}
          source={searchParams?.source ?? null}
          seed={getSafeSeed(searchParams?.seed)}
          initialDestinationSlug={getSafeDestination(searchParams?.destination)}
        />
      </DashboardShell>
    </>
  )
}
