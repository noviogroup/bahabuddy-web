export const TRAVEL_ORIGIN_STORAGE_KEY = 'baha_travel_origin'
export const TRAVEL_ORIGIN_DISMISSED_KEY = 'baha_travel_origin_prompt_dismissed'
export const TRAVEL_ORIGIN_EVENT = 'baha:travel-origin-updated'

export type TravelOriginPreference = {
  origin: string
  savedAt: string
}

export type TravelOriginEventDetail = {
  origin: string
}

export const TRAVEL_ORIGIN_SUGGESTIONS: Array<{ label: string; value: string }> = [
  { label: 'Miami (MIA)', value: 'Miami' },
  { label: 'Fort Lauderdale (FLL)', value: 'Fort Lauderdale' },
  { label: 'New York JFK (JFK)', value: 'New York' },
  { label: 'Newark (EWR)', value: 'Newark' },
  { label: 'LaGuardia (LGA)', value: 'LaGuardia' },
  { label: 'Atlanta (ATL)', value: 'Atlanta' },
  { label: 'Charlotte (CLT)', value: 'Charlotte' },
  { label: 'Dallas (DFW)', value: 'Dallas' },
  { label: 'Houston (IAH)', value: 'Houston' },
  { label: 'Chicago (ORD)', value: 'Chicago' },
  { label: 'Los Angeles (LAX)', value: 'Los Angeles' },
  { label: 'San Francisco (SFO)', value: 'San Francisco' },
  { label: 'Boston (BOS)', value: 'Boston' },
  { label: 'Philadelphia (PHL)', value: 'Philadelphia' },
  { label: 'Washington (IAD)', value: 'Washington' },
  { label: 'Orlando (MCO)', value: 'Orlando' },
  { label: 'Tampa (TPA)', value: 'Tampa' },
  { label: 'Detroit (DTW)', value: 'Detroit' },
  { label: 'Denver (DEN)', value: 'Denver' },
  { label: 'Seattle (SEA)', value: 'Seattle' },
  { label: 'Toronto (YYZ)', value: 'Toronto' },
  { label: 'London (LHR)', value: 'London' },
]

export function normalizeTravelOrigin(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

export function readStoredTravelOrigin(): TravelOriginPreference | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(TRAVEL_ORIGIN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TravelOriginPreference>
    const origin = normalizeTravelOrigin(String(parsed.origin ?? ''))
    if (!origin) return null
    return {
      origin,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    }
  } catch {
    return null
  }
}

export function saveTravelOrigin(input: string): TravelOriginPreference | null {
  if (typeof window === 'undefined') return null
  const origin = normalizeTravelOrigin(input)
  if (!origin) return null

  const preference: TravelOriginPreference = {
    origin,
    savedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(TRAVEL_ORIGIN_STORAGE_KEY, JSON.stringify(preference))
  window.localStorage.removeItem(TRAVEL_ORIGIN_DISMISSED_KEY)
  window.dispatchEvent(new CustomEvent<TravelOriginEventDetail>(TRAVEL_ORIGIN_EVENT, {
    detail: { origin },
  }))

  return preference
}

export function dismissTravelOriginPrompt() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TRAVEL_ORIGIN_DISMISSED_KEY, new Date().toISOString())
}

export function hasDismissedTravelOriginPrompt(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.localStorage.getItem(TRAVEL_ORIGIN_DISMISSED_KEY))
}
