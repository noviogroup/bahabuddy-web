import { redirect } from 'next/navigation'
import FlightBookingConfirmationClient, { type DemoBookingState } from '@/components/flights/FlightBookingConfirmationClient'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function FlightOfferConfirmationPage({
  params,
  searchParams,
}: {
  params: { offerId: string }
  searchParams: { tripId?: string; bookingId?: string; demoState?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const returnPath = `/flights/${params.offerId}/confirmation${queryString(searchParams)}`

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}`)
  }

  const demoState = demoBookingState(searchParams.demoState)
  const tripId = searchParams.tripId?.trim() || (demoState ? 'demo-trip' : '')
  const bookingId = searchParams.bookingId?.trim() || (demoState ? `demo-${demoState}` : '')

  if (!tripId || !bookingId) {
    redirect(`/flights/${params.offerId}/book`)
  }

  return (
    <FlightBookingConfirmationClient
      offerId={params.offerId}
      tripId={tripId}
      bookingId={bookingId}
      demoState={demoState}
    />
  )
}

function queryString(searchParams: { tripId?: string; bookingId?: string; demoState?: string }) {
  const params = new URLSearchParams()
  if (searchParams.tripId) params.set('tripId', searchParams.tripId)
  if (searchParams.bookingId) params.set('bookingId', searchParams.bookingId)
  if (searchParams.demoState) params.set('demoState', searchParams.demoState)
  const value = params.toString()
  return value ? `?${value}` : ''
}

function demoBookingState(value: string | undefined): DemoBookingState | undefined {
  if (!demoStatesEnabled()) return undefined
  if (value === 'confirmed' || value === 'pending' || value === 'provider_failed') return value
  return undefined
}

function demoStatesEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_BOOKING_STATES === 'true'
}
