import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StayGuestBookingClient from '@/components/stays/StayGuestBookingClient'

export const dynamic = 'force-dynamic'

interface SearchParams {
  rate_id?: string
  checkin?: string
  checkout?: string
  adults?: string
  room?: string
  amount?: string
  currency?: string
  hotel_name?: string
}

export default async function StayGuestsPage({
  params,
  searchParams,
}: {
  params: { hotelId: string }
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const redirectTo = `/stays/${encodeURIComponent(params.hotelId)}/guests?${toQuery(searchParams)}`
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`)
  }

  const rateId = searchParams.rate_id?.trim() ?? ''
  const checkin = searchParams.checkin?.trim() ?? ''
  const checkout = searchParams.checkout?.trim() ?? ''
  const amountCents = Number(searchParams.amount ?? 0)

  if (!rateId || !checkin || !checkout || !Number.isFinite(amountCents) || amountCents < 50) {
    redirect(`/stays/${encodeURIComponent(params.hotelId)}`)
  }

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <StayGuestBookingClient
      hotelId={params.hotelId}
      hotelName={searchParams.hotel_name ?? 'Selected stay'}
      rateId={rateId}
      checkin={checkin}
      checkout={checkout}
      adults={Math.max(1, Number(searchParams.adults ?? 2))}
      roomName={searchParams.room ?? 'Selected room'}
      amountCents={amountCents}
      currency={(searchParams.currency ?? 'USD').toUpperCase()}
      trips={(trips ?? []) as Array<{ id: string; name: string }>}
    />
  )
}

function toQuery(searchParams: SearchParams): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && value) params.set(key, value)
  }
  return params.toString()
}
