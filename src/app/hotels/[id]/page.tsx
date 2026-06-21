import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LegacyHotelsDetailPage({
  params,
  searchParams = {},
}: {
  params: { id: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  redirect(toStaysUrl(`/stays/${encodeURIComponent(params.id)}`, searchParams))
}

function toStaysUrl(path: string, searchParams: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value
    if (first) params.set(key, first)
  }
  const query = params.toString()
  return query ? `${path}?${query}` : path
}
