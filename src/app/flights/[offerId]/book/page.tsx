import { redirect } from 'next/navigation'
import FlightOfferBookingClient from '@/components/flights/FlightOfferBookingClient'
import {
  appendFlightCheckoutSummary,
  flightCheckoutSummaryFromSearchParams,
} from '@/lib/flight-checkout-summary'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function FlightOfferBookPage({
  params,
  searchParams = {},
}: {
  params: { offerId: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const summary = flightCheckoutSummaryFromSearchParams(searchParams)
  const bookingPath = appendFlightCheckoutSummary(`/flights/${offerPathSegment(params.offerId)}/book`, summary ?? {})
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(bookingPath)}`)
  }

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <FlightOfferBookingClient
      offerId={params.offerId}
      trips={(trips ?? []) as Array<{ id: string; name: string }>}
      summary={summary}
      returnTo={bookingPath}
    />
  )
}

function offerPathSegment(value: string): string {
  try {
    return decodeURIComponent(value) === value ? encodeURIComponent(value) : value
  } catch {
    return encodeURIComponent(value)
  }
}
