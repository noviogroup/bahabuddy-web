import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface SearchParams {
  [key: string]: string | string[] | undefined
}

export default function StayCheckoutPage({
  params,
  searchParams,
}: {
  params: { hotelId: string }
  searchParams: SearchParams
}) {
  const query = toQuery(searchParams)
  const target = `/stays/${encodeURIComponent(params.hotelId)}/guests${query ? `?${query}` : ''}`
  redirect(target)
}

function toQuery(searchParams: SearchParams): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && value) {
      params.set(key, value)
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item)
      }
    }
  }
  return params.toString()
}
