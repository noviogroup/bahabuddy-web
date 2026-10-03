import { legacyPermanentRedirect, type LegacySearchParams } from '@/lib/legacy-redirects'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: LegacySearchParams
}

export function generateMetadata({ searchParams }: PageProps): never {
  legacyPermanentRedirect('/stays', searchParams)
}

export default function LegacyHotelPage({ searchParams }: PageProps) {
  legacyPermanentRedirect('/stays', searchParams)
}
