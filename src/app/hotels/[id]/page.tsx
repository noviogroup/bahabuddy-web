import { legacyPermanentRedirect, type LegacySearchParams } from '@/lib/legacy-redirects'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
  searchParams?: LegacySearchParams
}

export function generateMetadata({ params, searchParams }: PageProps): never {
  legacyPermanentRedirect(`/stays/${encodeURIComponent(params.id)}`, searchParams)
}

export default function LegacyHotelsDetailPage({ params, searchParams }: PageProps) {
  legacyPermanentRedirect(`/stays/${encodeURIComponent(params.id)}`, searchParams)
}
