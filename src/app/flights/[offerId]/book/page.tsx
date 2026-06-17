import { redirect } from 'next/navigation'
import FlightOfferBookingClient from '@/components/flights/FlightOfferBookingClient'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function FlightOfferBookPage({
  params,
}: {
  params: { offerId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/flights/${params.offerId}/book`)}`)
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
    />
  )
}
