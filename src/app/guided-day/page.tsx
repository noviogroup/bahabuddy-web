import { legacyPermanentRedirect } from '@/lib/legacy-redirects'

export function generateMetadata(): never {
  legacyPermanentRedirect('/nassau-cruise-itineraries')
}

export default function GuidedDayPage() {
  legacyPermanentRedirect('/nassau-cruise-itineraries')
}
