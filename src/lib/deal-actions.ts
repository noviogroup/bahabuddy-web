import { buddyChatHref } from '@/lib/buddy-chat'
import { islandRestaurantFilterLabel } from '@/lib/island-context-links'

export type DealActionInput = {
  id?: string
  title: string
  deal_type: string
  island?: string | null
  resort_name?: string | null
}

export type DealActionLinks = {
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
  contextLabel: string
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  accommodation: 'Stay deal',
  hotel: 'Stay deal',
  stay: 'Stay deal',
  tour: 'Experience deal',
  activity: 'Experience deal',
  package: 'Package deal',
}

function normalizeType(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, '')
}

export function dealIslandLabel(value: string | null | undefined): string {
  return islandRestaurantFilterLabel(value)
}

function encodeParams(params: Record<string, string>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) search.set(key, value.trim())
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function askBuddyPrompt(deal: DealActionInput): string {
  const island = dealIslandLabel(deal.island)
  const pieces = [
    `Help me compare this Bahamas deal: ${deal.title}`,
    island ? `Island: ${island}` : '',
    deal.resort_name ? `Provider: ${deal.resort_name}` : '',
  ].filter(Boolean)
  return pieces.join('. ')
}

export function dealActionLinks(deal: DealActionInput, returnPath = '/deals'): DealActionLinks {
  const type = normalizeType(deal.deal_type)
  const island = dealIslandLabel(deal.island)
  const secondaryHref = buddyChatHref(askBuddyPrompt(deal))
  const contextLabel = DEAL_TYPE_LABELS[type] ?? 'Travel deal'

  if (type === 'accommodation' || type === 'hotel' || type === 'stay') {
    return {
      primaryHref: `/stays${encodeParams({ island })}`,
      primaryLabel: 'Check stays',
      secondaryHref,
      secondaryLabel: 'Ask Buddy',
      contextLabel,
    }
  }

  if (type === 'tour' || type === 'activity') {
    return {
      primaryHref: `/explore/places${encodeParams({ island, search: deal.title })}`,
      primaryLabel: 'View experiences',
      secondaryHref,
      secondaryLabel: 'Ask Buddy',
      contextLabel,
    }
  }

  if (type === 'package') {
    return {
      primaryHref: `/dashboard/trips/new${encodeParams({ returnTo: returnPath, source: 'package' })}`,
      primaryLabel: 'Build package',
      secondaryHref,
      secondaryLabel: 'Ask Buddy',
      contextLabel,
    }
  }

  return {
    primaryHref: `/explore/places${encodeParams({ island, search: deal.title })}`,
    primaryLabel: 'View related places',
    secondaryHref,
    secondaryLabel: 'Ask Buddy',
    contextLabel,
  }
}
