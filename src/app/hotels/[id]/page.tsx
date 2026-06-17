import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LegacyHotelsDetailPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/stays/${encodeURIComponent(params.id)}`)
}
