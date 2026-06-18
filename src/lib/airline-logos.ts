type AirlineLogoInput = {
  providerLogoUrl?: string | null
  airlineCode?: string | null
  airlineName?: string | null
}

const AIRLINE_CODE_BY_NAME: Record<string, string> = {
  'air canada': 'AC',
  'american airlines': 'AA',
  'american eagle': 'AA',
  bahamasair: 'UP',
  'british airways': 'BA',
  'caribbean airlines': 'BW',
  copa: 'CM',
  'copa airlines': 'CM',
  delta: 'DL',
  'delta air lines': 'DL',
  jetblue: 'B6',
  'jetblue airways': 'B6',
  silver: '3M',
  'silver airways': '3M',
  southwest: 'WN',
  'southwest airlines': 'WN',
  united: 'UA',
  'united airlines': 'UA',
  virgin: 'VS',
  'virgin atlantic': 'VS',
  westjet: 'WS',
  'western air': 'WU',
}

export function normalizeAirlineCode(value?: string | null): string {
  const code = (value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z0-9]{2,3}$/.test(code) ? code : ''
}

export function airlineCodeFromName(value?: string | null): string {
  const normalized = (value ?? '').trim().toLowerCase()
  return AIRLINE_CODE_BY_NAME[normalized] ?? ''
}

export function resolveAirlineLogoUrl({
  providerLogoUrl,
  airlineCode,
  airlineName,
}: AirlineLogoInput): string {
  const providerUrl = (providerLogoUrl ?? '').trim()
  if (/^https?:\/\//i.test(providerUrl)) return providerUrl

  const code = normalizeAirlineCode(airlineCode) || airlineCodeFromName(airlineName)
  if (!code) return ''

  const encodedCode = encodeURIComponent(code)
  return `https://content.r9cdn.net/rimg/provider-logos/airlines/v/${encodedCode}.png?crop=false&width=108&height=92&fallback=default2.png`
}
