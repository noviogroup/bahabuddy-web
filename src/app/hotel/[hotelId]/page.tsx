import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LegacyHotelDetailPage({
  params,
}: {
  params: { hotelId: string }
}) {
  redirect(`/stays/${encodeURIComponent(params.hotelId)}`)
}
