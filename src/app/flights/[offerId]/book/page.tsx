import { redirect } from 'next/navigation'
import FlightOfferBookingClient, {
  type FlightTravelerProfileDefaults,
} from '@/components/flights/FlightOfferBookingClient'
import {
  appendFlightCheckoutSummary,
  flightCheckoutSummaryFromSearchParams,
} from '@/lib/flight-checkout-summary'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type AuthUserForFlightDefaults = {
  id: string
  email?: string | null
  phone?: string | null
  user_metadata?: Record<string, unknown> | null
}

type FlightProfileRow = {
  display_name?: string | null
  email?: string | null
  country?: string | null
}

const COUNTRY_ALIASES: Record<string, string> = {
  BAHAMAS: 'BS',
  'THE BAHAMAS': 'BS',
  BHS: 'BS',
  USA: 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  CANADA: 'CA',
  'UNITED KINGDOM': 'GB',
  UK: 'GB',
}

const PHONE_CODES_BY_COUNTRY: Record<string, string> = {
  BS: '1',
  US: '1',
  CA: '1',
  GB: '44',
}

export default async function FlightOfferBookPage({
  params,
  searchParams = {},
}: {
  params: { offerId: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const summary = flightCheckoutSummaryFromSearchParams(searchParams)
  const bookingPath = appendFlightCheckoutSummary(`/flights/${offerPathSegment(params.offerId)}/book`, summary ?? {})
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(bookingPath)}`)
  }

  const tripsQuery = supabase
    .from('trips')
    .select('id, name')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  const profileQuery = supabase
    .from('users')
    .select('display_name, email, country')
    .eq('id', user.id)
    .maybeSingle()

  const [{ data: trips }, { data: profile }] = await Promise.all([tripsQuery, profileQuery])

  return (
    <FlightOfferBookingClient
      offerId={params.offerId}
      trips={(trips ?? []) as Array<{ id: string; name: string }>}
      summary={summary}
      returnTo={bookingPath}
      profileDefaults={profileDefaultsFromUser(user, profile)}
    />
  )
}

function offerPathSegment(value: string): string {
  try {
    return decodeURIComponent(value) === value ? encodeURIComponent(value) : value
  } catch {
    return encodeURIComponent(value)
  }
}

function profileDefaultsFromUser(
  user: AuthUserForFlightDefaults,
  profile?: FlightProfileRow | null,
): FlightTravelerProfileDefaults {
  const metadata = user.user_metadata ?? {}
  const displayName = stringValue(profile?.display_name) ?? metadataValue(metadata, ['display_name', 'full_name', 'name'])
  const [displayFirstName, displayLastName] = splitDisplayName(displayName)
  const countryCode = countryToIso2(
    stringValue(profile?.country) ?? metadataValue(metadata, ['country_code', 'country', 'nationality']),
  )
  const phoneCountryCode = normalizeCallingCode(
    metadataValue(metadata, ['phone_country_code', 'phoneCode', 'phone_code', 'calling_code', 'dial_code'])
      ?? phoneCodeForCountry(countryCode),
  )

  return compactProfileDefaults({
    firstName: metadataValue(metadata, ['first_name', 'given_name']) ?? displayFirstName,
    lastName: metadataValue(metadata, ['last_name', 'family_name']) ?? displayLastName,
    email: stringValue(profile?.email) ?? stringValue(user.email) ?? metadataValue(metadata, ['email']),
    phoneCountryCode,
    phoneNumber: normalizePhoneNumber(
      stringValue(user.phone) ?? metadataValue(metadata, ['phone_number', 'phone', 'mobile', 'mobile_phone']),
      phoneCountryCode,
    ),
    countryCode,
  })
}

function compactProfileDefaults(defaults: FlightTravelerProfileDefaults): FlightTravelerProfileDefaults {
  return Object.fromEntries(
    Object.entries(defaults).filter(([, value]) => Boolean(stringValue(value))),
  ) as FlightTravelerProfileDefaults
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function metadataValue(metadata: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = stringValue(metadata[key])
    if (value) return value
  }
  return undefined
}

function splitDisplayName(value?: string): [string | undefined, string | undefined] {
  const parts = stringValue(value)?.split(/\s+/).filter(Boolean) ?? []
  if (parts.length === 0) return [undefined, undefined]
  if (parts.length === 1) return [parts[0], undefined]
  return [parts[0], parts.slice(1).join(' ')]
}

function countryToIso2(value?: string): string | undefined {
  const country = stringValue(value)?.replace(/\./g, '').toUpperCase()
  if (!country) return undefined
  if (/^[A-Z]{2}$/.test(country)) return country
  return COUNTRY_ALIASES[country]
}

function phoneCodeForCountry(countryCode?: string): string | undefined {
  return countryCode ? PHONE_CODES_BY_COUNTRY[countryCode] : undefined
}

function normalizeCallingCode(value?: string): string | undefined {
  const callingCode = stringValue(value)?.replace(/[^\d]/g, '')
  return callingCode || undefined
}

function normalizePhoneNumber(value?: string, phoneCountryCode?: string): string | undefined {
  let phoneNumber = stringValue(value)?.replace(/[^\d]/g, '')
  if (!phoneNumber) return undefined
  if (phoneCountryCode && phoneNumber.startsWith(phoneCountryCode) && phoneNumber.length > phoneCountryCode.length + 6) {
    phoneNumber = phoneNumber.slice(phoneCountryCode.length)
  }
  return phoneNumber
}
