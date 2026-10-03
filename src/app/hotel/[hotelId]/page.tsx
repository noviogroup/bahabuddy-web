import { legacyPermanentRedirect, type LegacySearchParams } from '@/lib/legacy-redirects'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { hotelId: string }
  searchParams?: LegacySearchParams
}

export function generateMetadata({ params, searchParams }: PageProps): never {
  legacyPermanentRedirect(`/stays/${encodeURIComponent(params.hotelId)}`, searchParams)
}

export default function LegacyHotelDetailPage({ params, searchParams }: PageProps) {
  legacyPermanentRedirect(`/stays/${encodeURIComponent(params.hotelId)}`, searchParams)
}
