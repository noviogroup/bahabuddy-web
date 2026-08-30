export type AirlineCheckInLink = {
  href: string
  isAirlineLink: boolean
}

export function airlineCheckInLink(
  airline?: string | null,
  airlineCode?: string | null,
): AirlineCheckInLink {
  const key = `${airline?.trim().toLowerCase() ?? ''} ${airlineCode?.trim().toLowerCase() ?? ''}`

  if (key.includes('american') || hasCode(key, 'aa')) {
    return directLink('https://www.aa.com/reservation/flightCheckInViewReservationsAccess.do?anchorEvent=false&from=comp_nav&locale=en_US')
  }
  if (key.includes('delta') || hasCode(key, 'dl')) {
    return directLink('https://www.delta.com/us/en/check-in-security/overview')
  }
  if (key.includes('jetblue') || hasCode(key, 'b6')) {
    return directLink('https://www.jetblue.com/checkin/boarding-pass')
  }
  if (key.includes('bahamasair') || hasCode(key, 'up')) {
    return directLink('https://book.bahamasair.com/web/ICIPNRSearch.xhtml')
  }
  if (key.includes('united') || hasCode(key, 'ua')) {
    return directLink('https://www.united.com/en/us/checkin')
  }
  if (key.includes('southwest') || hasCode(key, 'wn')) {
    return directLink('https://www.southwest.com/air/check-in/')
  }
  if (key.includes('silver') || hasCode(key, '3m')) {
    return directLink('https://www.silverairways.com')
  }
  if (key.includes('air canada') || hasCode(key, 'ac')) {
    return directLink('https://www.aircanada.com/ca/en/aco/home/plan/check-in.html')
  }

  const query = airline?.trim() || airlineCode?.trim() || 'airline'
  return {
    href: `https://www.google.com/search?q=${encodeURIComponent(`${query} airline online check in`)}`,
    isAirlineLink: false,
  }
}

function directLink(href: string): AirlineCheckInLink {
  return { href, isAirlineLink: true }
}

function hasCode(key: string, code: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${code}([^a-z0-9]|$)`).test(key)
}
