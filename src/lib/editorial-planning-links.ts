export type EditorialPlanningSource = 'guide' | 'article' | 'social_video'

const MAX_SEED_LENGTH = 600

export function editorialSeed(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_SEED_LENGTH)
}

export function editorialTripHref({
  returnTo,
  source,
  seed,
}: {
  returnTo: string
  source: EditorialPlanningSource
  seed: string
}): string {
  const params = new URLSearchParams()
  params.set('returnTo', returnTo)
  params.set('source', source)

  const cleanSeed = editorialSeed(seed)
  if (cleanSeed) params.set('seed', cleanSeed)

  return `/dashboard/trips/new?${params.toString()}`
}

export function editorialBuddyHref(seed: string): string {
  const cleanSeed = editorialSeed(seed)
  return cleanSeed
    ? `/dashboard/chat?q=${encodeURIComponent(cleanSeed)}`
    : '/dashboard/chat'
}
