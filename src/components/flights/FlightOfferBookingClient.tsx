'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  routeCodesFromSummary,
  type FlightCheckoutLeg,
  type FlightCheckoutSummary,
} from '@/lib/flight-checkout-summary'
import { resolveAirlineLogoUrl } from '@/lib/airline-logos'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
} from '@/components/marketplace/TravelSearchFields'
import FareExpiryCountdown from '@/components/flights/FareExpiryCountdown'
import {
  normalizeFlightAncillaries,
  normalizeFlightSeatMaps,
  selectedAncillaryServices,
  selectedSeatServices,
  type FlightAncillary,
  type FlightAncillaryCategory,
  type FlightSeat,
  type FlightSeatMap,
} from '@/lib/flight-seat-map'

type TripOption = { id: string; name: string }
type CheckoutStage = 'details' | 'addOns' | 'payment' | 'processing' | 'error'

export type FlightTravelerProfileDefaults = {
  firstName?: string
  lastName?: string
  email?: string
  phoneCountryCode?: string
  phoneNumber?: string
  countryCode?: string
}

interface Props {
  offerId: string
  trips: TripOption[]
  summary?: FlightCheckoutSummary
  returnTo?: string
  profileDefaults?: FlightTravelerProfileDefaults
}

type Traveler = {
  firstName: string
  lastName: string
  email: string
  phoneCountryCode: string
  phoneNumber: string
  birthday: string
  gender: string
  nationality: string
  documentNumber: string
  documentIssueCountry: string
  documentExpiry: string
}

const emptyTraveler: Traveler = {
  firstName: '',
  lastName: '',
  email: '',
  phoneCountryCode: '1',
  phoneNumber: '',
  birthday: '',
  gender: 'M',
  nationality: 'US',
  documentNumber: '',
  documentIssueCountry: 'US',
  documentExpiry: '',
}

function createTravelers(count: number, leadDefaults?: Partial<Traveler>): Traveler[] {
  return Array.from({ length: count }, (_, index) => (
    index === 0 ? { ...emptyTraveler, ...leadDefaults } : { ...emptyTraveler }
  ))
}

export default function FlightOfferBookingClient({
  offerId,
  trips,
  summary,
  returnTo,
  profileDefaults,
}: Props) {
  const [tripId, setTripId] = useState(trips[0]?.id ?? '')
  const passengerCount = Math.max(1, Math.min(9, Math.round(Number(summary?.passengers ?? 1) || 1)))
  const leadProfileDefaults = useMemo(() => travelerDefaultsFromProfile(profileDefaults), [profileDefaults])
  const hasLeadProfileDefaults = useMemo(() => hasProfileDefaults(profileDefaults), [profileDefaults])
  const [travelers, setTravelers] = useState<Traveler[]>(() => createTravelers(passengerCount, leadProfileDefaults))
  const [prebook, setPrebook] = useState<Record<string, unknown> | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [stage, setStage] = useState<CheckoutStage>('details')
  const [selectedSeats, setSelectedSeats] = useState<Record<string, Record<number, FlightSeat>>>({})
  const [selectedAncillaries, setSelectedAncillaries] = useState<Record<string, Record<number, FlightAncillary>>>({})
  const [attachedServiceSelectionKey, setAttachedServiceSelectionKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const leadTraveler = travelers[0] ?? emptyTraveler
  const requiresFreshSearch = !summary
  const seatMaps = useMemo(() => normalizeFlightSeatMaps(prebook?.seat_maps ?? prebook), [prebook])
  const ancillaries = useMemo(() => normalizeFlightAncillaries(prebook?.ancillaries ?? prebook), [prebook])

  const price = Number(prebook?.price ?? summary?.price ?? 0)
  const currency = String(prebook?.currency ?? summary?.currency ?? 'USD')
  const formattedPrice = useMemo(() => {
    if (!price) return 'Check fare'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
  }, [price, currency])

  useEffect(() => {
    setTravelers((current) => {
      if (current.length === passengerCount) return current
      if (current.length > passengerCount) return current.slice(0, passengerCount)
      return [
        ...current,
        ...createTravelers(passengerCount - current.length),
      ]
    })
  }, [passengerCount])

  async function createPrebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tripId) {
      setError('Create or select a trip before booking this flight.')
      return
    }
    setError(null)
    setStage('processing')

    try {
      const result = await postJson('/api/booking/flights/prebook', {
        offerId,
        contact: {
          firstName: leadTraveler.firstName,
          lastName: leadTraveler.lastName,
          email: leadTraveler.email,
          phoneCountryCode: leadTraveler.phoneCountryCode,
          phoneNumber: leadTraveler.phoneNumber,
        },
        passengers: travelers.map((traveler) => ({
          firstName: traveler.firstName,
          lastName: traveler.lastName,
          birthday: traveler.birthday,
          gender: traveler.gender,
          nationality: traveler.nationality,
          documentType: 'passport',
          documentNumber: traveler.documentNumber,
          documentIssueCountry: traveler.documentIssueCountry,
          documentExpiry: traveler.documentExpiry,
        })),
      })
      await addFlightToTrip(tripId, offerId, result, summary)

      setPrebook(result)
      setStage('addOns')
    } catch (err) {
      setError(flightCheckoutErrorMessage(err))
      setStage('error')
    }
  }

  async function continueToPayment() {
    if (!prebook) return
    setError(null)
    setStage('processing')
    try {
      let paymentSession = prebook
      const services = [
        ...selectedSeatServices(selectedSeats),
        ...selectedAncillaryServices(selectedAncillaries),
      ]
      const serviceSelectionKey = JSON.stringify(
        [...services].sort((a, b) => a.passengerIndex - b.passengerIndex || a.serviceId.localeCompare(b.serviceId)),
      )
      if (services.length > 0 && serviceSelectionKey !== attachedServiceSelectionKey) {
        const id = String(prebook.prebook_id ?? prebook.prebookId ?? '')
        const updatedSession = await postJson(
          `/api/booking/flights/prebook/${encodeURIComponent(id)}/services`,
          { selectedServices: services },
        )
        paymentSession = {
          ...prebook,
          ...updatedSession,
          seat_maps: normalizeFlightSeatMaps(updatedSession.seat_maps ?? updatedSession).length > 0
            ? updatedSession.seat_maps
            : prebook.seat_maps,
          ancillaries: normalizeFlightAncillaries(updatedSession.ancillaries ?? updatedSession).length > 0
            ? updatedSession.ancillaries
            : prebook.ancillaries,
        }
        setPrebook(paymentSession)
        setAttachedServiceSelectionKey(serviceSelectionKey)
      }
      const sessionClientSecret = String(paymentSession.client_secret ?? paymentSession.clientSecret ?? paymentSession.secretKey ?? '')
      const publishableKey = String(paymentSession.publishable_key ?? paymentSession.publishableKey ?? '')
      if (!sessionClientSecret || !publishableKey) {
        throw new Error('Booking service did not return payment setup details.')
      }
      setStripePromise(loadStripe(publishableKey))
      setStage('payment')
    } catch (err) {
      setError(flightCheckoutErrorMessage(err))
      setStage('addOns')
    }
  }

  const toggleSeat = (segmentKey: string, passengerIndex: number, seat: FlightSeat) => {
    setAttachedServiceSelectionKey('')
    setSelectedSeats((current) => {
      const segment = { ...(current[segmentKey] ?? {}) }
      if (segment[passengerIndex]?.serviceId === seat.serviceId) delete segment[passengerIndex]
      else segment[passengerIndex] = seat
      return { ...current, [segmentKey]: segment }
    })
  }

  const toggleAncillary = (passengerIndex: number, option: FlightAncillary) => {
    const selectionKey = `${option.segmentKey}:${option.category}`
    setAttachedServiceSelectionKey('')
    setSelectedAncillaries((current) => {
      const category = { ...(current[selectionKey] ?? {}) }
      if (category[passengerIndex]?.serviceId === option.serviceId) delete category[passengerIndex]
      else category[passengerIndex] = option
      return { ...current, [selectionKey]: category }
    })
  }

  const updateTraveler = (index: number, key: keyof Traveler, value: string) => {
    setTravelers((current) => current.map((traveler, travelerIndex) => (
      travelerIndex === index ? { ...traveler, [key]: value } : traveler
    )))
  }
  const prebookId = String(prebook?.prebook_id ?? prebook?.prebookId ?? '')
  const transactionId = String(prebook?.transaction_id ?? prebook?.transactionId ?? '')
  const clientSecret = String(prebook?.client_secret ?? prebook?.clientSecret ?? prebook?.secretKey ?? '')
  const checkoutState = requiresFreshSearch
    ? 'Fresh fare needed'
    : stage === 'payment'
      ? 'Payment ready'
      : stage === 'addOns'
        ? 'Choose add-ons'
      : stage === 'processing'
        ? 'Verifying fare'
        : stage === 'error'
          ? 'Review required'
          : 'Traveler details'

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-night md:py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">
              Secure flight booking
            </p>
            <h1 className="mt-1 text-3xl font-bold text-night">
              Book this fare
            </h1>
          </div>
          <Link
            href="/flights"
            className="inline-flex w-fit rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            Back to flight search
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 space-y-5">
            <div className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-brand-700">
                    {checkoutState}
                  </p>
	                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-charcoal">
	                    {requiresFreshSearch
	                      ? 'This link is missing live fare details. Search current fares before payment.'
	                      : 'Review the selected fare, confirm traveler details, then continue to payment.'}
	                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold uppercase text-charcoal">
                    {requiresFreshSearch ? 'Status' : 'Total'}
                  </p>
                  <p className="text-2xl font-bold text-night">
                    {requiresFreshSearch ? 'Search again' : formattedPrice}
                  </p>
                </div>
              </div>
              <FlightFareSummary summary={summary} />
            </div>

            {error && (
              <div className="rounded-2xl bg-coral-50 p-4 text-sm font-medium text-coral-800 ring-1 ring-coral-200">
                {error}
              </div>
            )}

            {trips.length === 0 && (
              <div className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                <p className="text-sm font-semibold uppercase text-gray-500">
                  Trip required
                </p>
                <h2 className="mt-2 text-2xl font-bold text-night">
                  Create a trip before booking this fare
                </h2>
                <p className="mt-2 text-sm leading-6 text-charcoal">
	                  Flights must attach to a Baha Buddy trip before payment and booking. Create the trip first, then return here to continue checkout.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/trips/new?returnTo=${encodeURIComponent(returnTo ?? `/flights/${offerId}/book`)}&source=flight`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    Create trip
                  </Link>
                  <Link
                    href="/flights"
                    className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                  >
                    Back to flights
                  </Link>
                </div>
              </div>
            )}

            {trips.length > 0 && requiresFreshSearch && (
              <FareRecoveryPanel offerId={offerId} />
            )}

            {trips.length > 0 && !requiresFreshSearch && ['details', 'processing', 'error'].includes(stage) && (
              <form onSubmit={createPrebook} className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                {hasLeadProfileDefaults && (
                  <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold leading-6 text-brand-900">
                    Traveler 1 profile loaded. Confirm or edit the email, phone, nationality, and passport country before payment.
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Trip" htmlFor="flight-trip">
                    <TravelSearchSelect id="flight-trip" value={tripId} onChange={(e) => setTripId(e.target.value)} required>
                      {trips.length === 0 ? <option value="">No trips found</option> : null}
                      {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                    </TravelSearchSelect>
                  </Field>
                  <Field label="Email" htmlFor="flight-email">
                    <TravelSearchInput id="flight-email" type="email" value={leadTraveler.email} onChange={(e) => updateTraveler(0, 'email', e.target.value)} required />
                  </Field>
                  <Field label="Phone country code" htmlFor="flight-phone-country-code">
                    <TravelSearchInput id="flight-phone-country-code" value={leadTraveler.phoneCountryCode} onChange={(e) => updateTraveler(0, 'phoneCountryCode', e.target.value)} required />
                  </Field>
                  <Field label="Phone number" htmlFor="flight-phone-number">
                    <TravelSearchInput id="flight-phone-number" value={leadTraveler.phoneNumber} onChange={(e) => updateTraveler(0, 'phoneNumber', e.target.value)} required />
                  </Field>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm font-bold uppercase text-gray-500">
                      Traveler details
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-charcoal">
                      Enter one passport profile for each traveler on this fare.
                    </p>
                  </div>
                  <FlightPrivacyDisclosure context="traveler" />

                  {travelers.map((item, index) => {
                    const prefix = passengerCount > 1 ? `Traveler ${index + 1} ` : ''
                    const labelSuffix = index === 0 && passengerCount > 1 ? 'Lead passenger' : `Passenger ${index + 1}`
                    return (
                      <section key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <h2 className="text-base font-bold text-night">
                            Traveler {index + 1}
                          </h2>
                          <p className="text-xs font-bold uppercase text-gray-500">
                            {labelSuffix}
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label={`${prefix}first name`} htmlFor={`flight-traveler-${index}-first-name`}>
                            <TravelSearchInput id={`flight-traveler-${index}-first-name`} value={item.firstName} onChange={(e) => updateTraveler(index, 'firstName', e.target.value)} required />
                          </Field>
                          <Field label={`${prefix}last name`} htmlFor={`flight-traveler-${index}-last-name`}>
                            <TravelSearchInput id={`flight-traveler-${index}-last-name`} value={item.lastName} onChange={(e) => updateTraveler(index, 'lastName', e.target.value)} required />
                          </Field>
                          <Field label={`${prefix}date of birth`} htmlFor={`flight-traveler-${index}-birthday`}>
                            <TravelSearchInput id={`flight-traveler-${index}-birthday`} type="date" value={item.birthday} onChange={(e) => updateTraveler(index, 'birthday', e.target.value)} required />
                          </Field>
                          <Field label={`${prefix}gender`} htmlFor={`flight-traveler-${index}-gender`}>
                            <TravelSearchSelect id={`flight-traveler-${index}-gender`} value={item.gender} onChange={(e) => updateTraveler(index, 'gender', e.target.value)}>
                              <option value="M">Male</option>
                              <option value="F">Female</option>
                              <option value="X">Non-binary / X</option>
                            </TravelSearchSelect>
                          </Field>
                          <Field label={`${prefix}nationality`} htmlFor={`flight-traveler-${index}-nationality`}>
                            <TravelSearchInput id={`flight-traveler-${index}-nationality`} value={item.nationality} onChange={(e) => updateTraveler(index, 'nationality', e.target.value.toUpperCase())} maxLength={2} required />
                          </Field>
                          <Field label={`${prefix}passport number`} htmlFor={`flight-traveler-${index}-passport-number`}>
                            <TravelSearchInput id={`flight-traveler-${index}-passport-number`} value={item.documentNumber} onChange={(e) => updateTraveler(index, 'documentNumber', e.target.value)} required />
                          </Field>
                          <Field label={`${prefix}passport issue country`} htmlFor={`flight-traveler-${index}-passport-issue-country`}>
                            <TravelSearchInput id={`flight-traveler-${index}-passport-issue-country`} value={item.documentIssueCountry} onChange={(e) => updateTraveler(index, 'documentIssueCountry', e.target.value.toUpperCase())} maxLength={2} required />
                          </Field>
                          <Field label={`${prefix}passport expiry`} htmlFor={`flight-traveler-${index}-passport-expiry`}>
                            <TravelSearchInput id={`flight-traveler-${index}-passport-expiry`} type="date" value={item.documentExpiry} onChange={(e) => updateTraveler(index, 'documentExpiry', e.target.value)} required />
                          </Field>
                        </div>
                      </section>
                    )
                  })}
                </div>
                <button type="submit" disabled={stage === 'processing'} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">

                  {stage === 'processing' ? 'Verifying fare and loading add-ons...' : 'Verify fare and continue to add-ons'}
                </button>
              </form>
            )}

            {!requiresFreshSearch && stage === 'addOns' && prebook && (
              <div className="space-y-5">
                <FlightSeatSelectionPanel
                  seatMaps={seatMaps}
                  travelers={travelers}
                  selections={selectedSeats}
                  onSeatSelected={toggleSeat}
                />
                <FlightAncillarySelectionPanel
                  options={ancillaries}
                  travelers={travelers}
                  selections={selectedAncillaries}
                  onSelected={toggleAncillary}
                  onContinue={continueToPayment}
                />
              </div>
            )}

            {!requiresFreshSearch && stage === 'payment' && stripePromise && clientSecret && prebookId && transactionId && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <FlightPaymentForm
                  tripId={tripId}
                  offerId={offerId}
                  prebookId={prebookId}
                  transactionId={transactionId}
                  summary={summary}
                  setError={setError}
                  setStage={setStage}
                />
              </Elements>
            )}
          </div>

          <FlightCheckoutRail
            state={checkoutState}
            hasTrip={trips.length > 0}
            hasSummary={Boolean(summary)}
            hasPrebook={Boolean(prebook)}
            stage={stage}
            summary={summary}
          />
        </div>
      </section>
    </main>
  )
}

function travelerDefaultsFromProfile(profileDefaults?: FlightTravelerProfileDefaults): Partial<Traveler> {
  if (!profileDefaults) return {}

  const countryCode = normalizeCountryCode(profileDefaults.countryCode)
  const phoneCountryCode = normalizePhoneCountryCode(profileDefaults.phoneCountryCode)
  const traveler: Partial<Traveler> = {}

  const firstName = trimmedValue(profileDefaults.firstName)
  const lastName = trimmedValue(profileDefaults.lastName)
  const email = trimmedValue(profileDefaults.email)
  const phoneNumber = normalizePhoneNumber(profileDefaults.phoneNumber, phoneCountryCode)

  if (firstName) traveler.firstName = firstName
  if (lastName) traveler.lastName = lastName
  if (email) traveler.email = email
  if (phoneCountryCode) traveler.phoneCountryCode = phoneCountryCode
  if (phoneNumber) traveler.phoneNumber = phoneNumber
  if (countryCode) {
    traveler.nationality = countryCode
    traveler.documentIssueCountry = countryCode
  }

  return traveler
}

function hasProfileDefaults(profileDefaults?: FlightTravelerProfileDefaults): boolean {
  if (!profileDefaults) return false
  return Object.values(profileDefaults).some((value) => Boolean(trimmedValue(value)))
}

function trimmedValue(value?: string): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCountryCode(value?: string): string {
  const countryCode = trimmedValue(value).toUpperCase()
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : ''
}

function normalizePhoneCountryCode(value?: string): string {
  return trimmedValue(value).replace(/[^\d]/g, '')
}

function normalizePhoneNumber(value?: string, phoneCountryCode?: string): string {
  let phoneNumber = trimmedValue(value).replace(/[^\d]/g, '')
  if (phoneCountryCode && phoneNumber.startsWith(phoneCountryCode) && phoneNumber.length > phoneCountryCode.length + 6) {
    phoneNumber = phoneNumber.slice(phoneCountryCode.length)
  }
  return phoneNumber
}

function FareRecoveryPanel({ offerId }: { offerId: string }) {
  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <p className="text-sm font-semibold uppercase text-gray-500">
        Fresh fare required
      </p>
      <h2 className="mt-2 text-2xl font-bold text-night">
        Search again before booking this fare
      </h2>
      <p className="mt-2 text-sm leading-6 text-charcoal">
        Flight offers can expire quickly, and this link does not include the selected fare details Baha Buddy needs before payment. Search current fares, pick the live option again, then continue checkout from that card.
      </p>
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-xs font-bold uppercase text-gray-500">
          Offer reference
        </p>
        <p className="mt-1 break-all text-sm font-bold text-night">
          {shortOfferId(offerId)}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/flights"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Search current fares
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  )
}

function FlightSeatSelectionPanel({
  seatMaps,
  travelers,
  selections,
  onSeatSelected,
}: {
  seatMaps: FlightSeatMap[]
  travelers: Traveler[]
  selections: Record<string, Record<number, FlightSeat>>
  onSeatSelected: (segmentKey: string, passengerIndex: number, seat: FlightSeat) => void
}) {
  const [activePassenger, setActivePassenger] = useState(0)
  const [activeSegmentKey, setActiveSegmentKey] = useState(seatMaps[0]?.segmentKey ?? '')
  const activeMap = seatMaps.find((seatMap) => seatMap.segmentKey === activeSegmentKey) ?? seatMaps[0]

  if (!activeMap) {
    return (
      <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-700" aria-hidden="true">
            S
          </span>
          <div>
            <p className="text-xs font-bold uppercase text-brand-700">Seat selection</p>
            <h2 className="mt-1 text-xl font-bold text-night">Seat map unavailable for this flight</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
              This airline did not return seats during checkout. Continue to payment now; you can manage seats with the airline after confirmation.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const segmentSelections = selections[activeMap.segmentKey] ?? {}
  const columns = Array.from(new Set(activeMap.seats.map((seat) => seat.column))).sort()
  const rows = Array.from(new Set(activeMap.seats.map((seat) => seat.row))).sort((a, b) => a - b)
  const seatsByPosition = new Map(activeMap.seats.map((seat) => [`${seat.row}-${seat.column}`, seat]))
  const occupiedBy = new Map(Object.entries(segmentSelections).map(([index, seat]) => [seat.serviceId, Number(index)]))
  const aisleIndex = seatAisleIndex(columns, activeMap.seats)

  return (
    <section className="overflow-hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-brand-100 bg-brand-50 px-5 py-5 md:px-6">
        <p className="text-xs font-bold uppercase text-brand-700">Seat selection</p>
        <h2 className="mt-1 text-2xl font-bold text-night">Choose your place in the cabin</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-charcoal">
          Pick one seat for each traveler on each flight, or continue without selecting. Seat prices are added before payment.
        </p>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        {seatMaps.length > 1 && (
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Flight</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {seatMaps.map((seatMap) => (
                <button
                  key={seatMap.segmentKey}
                  type="button"
                  onClick={() => setActiveSegmentKey(seatMap.segmentKey)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ring-1 transition-colors ${seatMap.segmentKey === activeMap.segmentKey ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-charcoal ring-gray-300 hover:bg-gray-50'}`}
                >
                  {seatMap.segmentLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase text-gray-500">Select for</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {travelers.map((traveler, index) => {
              const assigned = segmentSelections[index]
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActivePassenger(index)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ring-1 transition-colors ${activePassenger === index ? 'bg-brand-50 text-brand-700 ring-brand-600' : 'bg-white text-charcoal ring-gray-300 hover:bg-gray-50'}`}
                >
                  {traveler.firstName || `Traveler ${index + 1}`}{assigned ? ` · ${assigned.seatNumber}` : ''}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-dashed border-gray-300 pb-4">
            <div>
              <p className="text-xs font-bold uppercase text-brand-700">Cabin</p>
              <p className="mt-1 text-base font-bold text-night">{activeMap.segmentLabel}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-charcoal ring-1 ring-gray-200">Front ↑</span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="mx-auto w-max">
              <div className="mb-2 flex pl-9">
                {columns.map((column, columnIndex) => (
                  <div key={column} className={columnIndex === aisleIndex ? 'ml-6' : ''}>
                    <div className="w-12 text-center text-xs font-bold text-gray-500">{column}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row} className="flex items-center">
                    <span className="w-9 text-xs font-bold text-gray-500">{row}</span>
                    {columns.map((column, columnIndex) => {
                      const seat = seatsByPosition.get(`${row}-${column}`)
                      const selected = segmentSelections[activePassenger]?.serviceId === seat?.serviceId
                      const occupiedPassenger = seat ? occupiedBy.get(seat.serviceId) : undefined
                      const occupied = occupiedPassenger !== undefined && !selected
                      const enabled = Boolean(seat?.available && !occupied)
                      return (
                        <div key={column} className={columnIndex === aisleIndex ? 'ml-6' : ''}>
                          <button
                            type="button"
                            disabled={!enabled}
                            aria-pressed={selected}
                            aria-label={seat ? `${seat.seatNumber}, ${formatSeatPrice(seat)}${occupied ? `, selected by traveler ${occupiedPassenger! + 1}` : ''}` : `Unavailable seat ${row}${column}`}
                            onClick={() => seat && onSeatSelected(activeMap.segmentKey, activePassenger, seat)}
                            className={`mx-1 flex h-12 w-10 flex-col items-center justify-center rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${seatClassName(seat, selected, occupied)}`}
                          >
                            <span className="text-xs">{seat && seat.available ? occupied ? occupiedPassenger! + 1 : seat.seatNumber : '×'}</span>
                            {seat && seat.available && !occupied && <span>{formatSeatPrice(seat)}</span>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-dashed border-gray-300 pt-4 text-xs font-semibold text-charcoal">
            <SeatLegend className="bg-brand-600" label="Standard" />
            <SeatLegend className="bg-palm-600" label="Extra legroom" />
            <SeatLegend className="bg-gold-400" label="Exit row" />
            <SeatLegend className="bg-gray-300" label="Unavailable" />
          </div>
        </div>

      </div>
    </section>
  )
}

function FlightAncillarySelectionPanel({
  options,
  travelers,
  selections,
  onSelected,
  onContinue,
}: {
  options: FlightAncillary[]
  travelers: Traveler[]
  selections: Record<string, Record<number, FlightAncillary>>
  onSelected: (passengerIndex: number, option: FlightAncillary) => void
  onContinue: () => void
}) {
  const categories: FlightAncillaryCategory[] = ['baggage', 'meal', 'lounge']
  const selectedOptions = Object.values(selections).flatMap((category) => Object.values(category))
  const selectedTotal = selectedOptions.reduce((total, option) => total + option.price, 0)
  const selectedCurrency = selectedOptions[0]?.currency ?? options[0]?.currency ?? 'USD'

  return (
    <section className="overflow-hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gold-200 bg-gold-50 px-5 py-5 md:px-6">
        <p className="text-xs font-bold uppercase text-gold-800">Airline add-ons</p>
        <h2 className="mt-1 text-2xl font-bold text-night">Pack your flight your way</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-charcoal">
          Choose only the baggage, meals, or lounge access this airline returned for your fare. Nothing is preselected.
        </p>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        {options.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-base font-bold text-night">No extra services available</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-charcoal">
              This airline did not offer baggage, meal, or lounge add-ons for this fare. Nothing extra will be charged.
            </p>
          </div>
        ) : categories.map((category) => {
          const categoryOptions = options.filter((option) => option.category === category)
          if (categoryOptions.length === 0) return null
          return (
            <div key={category} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${ancillaryIconClass(category)}`} aria-hidden="true">
                  {ancillaryIcon(category)}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">Available from the airline</p>
                  <h3 className="text-lg font-bold text-night">{ancillaryCategoryLabel(category)}</h3>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {categoryOptions.map((option) => {
                  const selectionKey = `${option.segmentKey}:${option.category}`
                  const categorySelections = selections[selectionKey] ?? {}
                  return (
                    <div key={option.serviceId} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-night">{option.name}</p>
                          {option.description && <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">{option.description}</p>}
                          {option.segmentLabel && <p className="mt-1 text-xs font-bold text-brand-700">{option.segmentLabel}</p>}
                        </div>
                        <p className="shrink-0 text-sm font-bold text-night">{formatAncillaryPrice(option)}</p>
                      </div>
                      <p className="mt-3 text-xs font-bold uppercase text-gray-500">Add for</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {travelers.map((traveler, passengerIndex) => {
                          const selected = categorySelections[passengerIndex]?.serviceId === option.serviceId
                          return (
                            <button
                              key={passengerIndex}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => onSelected(passengerIndex, option)}
                              className={`rounded-full px-3 py-2 text-xs font-bold ring-1 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${selected ? 'bg-brand-50 text-brand-700 ring-brand-600' : 'bg-white text-charcoal ring-gray-300 hover:bg-gray-50'}`}
                            >
                              {traveler.firstName || `Traveler ${passengerIndex + 1}`}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {selectedOptions.length > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
            <div>
              <p className="text-xs font-bold uppercase text-brand-700">Selected add-ons</p>
              <p className="mt-0.5 text-sm font-semibold text-charcoal">{selectedOptions.length} traveler service{selectedOptions.length === 1 ? '' : 's'}</p>
            </div>
            <p className="text-lg font-bold text-night">+{formatAmount(selectedTotal, selectedCurrency)}</p>
          </div>
        )}

        <button type="button" onClick={onContinue} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2">
          Continue to payment
        </button>
      </div>
    </section>
  )
}

function ancillaryCategoryLabel(category: FlightAncillaryCategory): string {
  if (category === 'baggage') return 'Extra baggage'
  if (category === 'meal') return 'Meals'
  return 'Lounge access'
}

function ancillaryIcon(category: FlightAncillaryCategory): string {
  if (category === 'baggage') return '▣'
  if (category === 'meal') return '◇'
  return '◒'
}

function ancillaryIconClass(category: FlightAncillaryCategory): string {
  if (category === 'baggage') return 'bg-brand-50 text-brand-700'
  if (category === 'meal') return 'bg-coral-50 text-coral-800'
  return 'bg-palm-50 text-palm-700'
}

function formatAncillaryPrice(option: FlightAncillary): string {
  return formatAmount(option.price, option.currency)
}

function formatAmount(value: number, currency: string): string {
  if (!value) return 'Included'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function SeatLegend({ className, label }: { className: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${className}`} aria-hidden="true" />{label}</span>
}

function seatClassName(seat: FlightSeat | undefined, selected: boolean, occupied: boolean): string {
  if (!seat?.available) return 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-500'
  if (selected) return 'border-brand-600 bg-white text-brand-700 shadow-sm'
  if (occupied) return 'cursor-not-allowed border-gray-300 bg-gray-300 text-gray-600'
  if (seat.seatType === 'extra_legroom') return 'border-palm-600 bg-palm-600 text-white hover:bg-palm-700'
  if (seat.seatType === 'exit_row') return 'border-gold-400 bg-gold-400 text-night hover:bg-gold-500'
  return 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'
}

function formatSeatPrice(seat: FlightSeat): string {
  if (!seat.price) return 'Free'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: seat.currency, maximumFractionDigits: 0 }).format(seat.price)
  } catch {
    return `${seat.currency} ${seat.price}`
  }
}

function seatAisleIndex(columns: string[], seats: FlightSeat[]): number {
  if (columns.length < 2) return -1
  const dominant = new Map<string, string>()
  columns.forEach((column) => {
    const counts = new Map<string, number>()
    seats.filter((seat) => seat.column === column && seat.position).forEach((seat) => {
      counts.set(seat.position, (counts.get(seat.position) ?? 0) + 1)
    })
    const winner = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
    if (winner) dominant.set(column, winner)
  })
  for (let index = 1; index < columns.length; index += 1) {
    if (dominant.get(columns[index - 1]) === 'aisle' && dominant.get(columns[index]) === 'aisle') return index
  }
  return Math.floor(columns.length / 2)
}

function FlightCheckoutRail({
  state,
  hasTrip,
  hasSummary,
  hasPrebook,
  stage,
  summary,
}: {
  state: string
  hasTrip: boolean
  hasSummary: boolean
  hasPrebook: boolean
  stage: CheckoutStage
  summary?: FlightCheckoutSummary
}) {
  const travelerDetailsComplete = hasPrebook
  const addOnsComplete = stage === 'payment'
  const travelerDetailsActive = stage === 'details' || stage === 'error' || (stage === 'processing' && !hasPrebook)
  const addOnsActive = stage === 'addOns' || (stage === 'processing' && hasPrebook)
  const paymentActive = stage === 'payment'
  const steps = [
    {
      label: 'Fare selected',
      complete: hasSummary,
      detail: hasSummary ? 'Fare details attached' : 'Choose a current fare first',
    },
    {
      label: 'Trip selected',
      complete: hasTrip,
      detail: hasTrip ? 'Ready to save into My Trip' : 'Create a trip before checkout',
    },
    {
      label: 'Traveler details',
      complete: travelerDetailsComplete,
      active: travelerDetailsActive,
      detail: travelerDetailsComplete ? 'Passenger details received' : 'Confirm traveler and passport details',
    },
    {
      label: 'Add-ons',
      complete: addOnsComplete,
      active: addOnsActive,
      detail: stage === 'processing' && hasPrebook
        ? 'Applying selected services'
        : addOnsComplete
          ? 'Add-on choices confirmed'
          : 'Choose seats and airline-provided extras',
    },
    {
      label: 'Payment',
      complete: false,
      active: paymentActive,
      detail: stage === 'payment' ? 'Enter payment details' : 'Next step after add-ons',
    },
  ]
  const completedCount = steps.filter((step) => step.complete).length
  const activeStep = steps.find((step) => step.active) ?? steps.find((step) => !step.complete) ?? steps[steps.length - 1]
  const progress = Math.round((completedCount / steps.length) * 100)

  return (
    <aside
      aria-label="Flight checkout status"
      className="space-y-4 lg:sticky lg:top-24"
    >
      <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">
              Checkout progress
            </p>
            <h2 className="mt-1 text-lg font-bold text-night">
              {activeStep?.label ?? state}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
            {completedCount} of {steps.length}
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
          <div
            className="h-full rounded-full bg-brand-600"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 divide-y divide-gray-100">
          {steps.map((step, index) => (
            <div key={step.label} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                  step.complete
                    ? 'border-palm-200 bg-palm-50 text-palm-700'
                    : step.active
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-400'
                }`}
                aria-hidden="true"
              >
                {step.complete ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                    <path d="m3.5 8.2 2.8 2.8 6.2-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-night">
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs font-semibold leading-5 text-gray-500">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-bold uppercase text-gray-500">
          Fare snapshot
        </p>
        <dl className="mt-3 space-y-2">
          <RailFact label="Route" value={summary?.route ?? 'Search required'} />
          <RailFact label="Airline" value={summary?.airline ?? 'Current fare needed'} />
          <RailFact label="Travelers" value={summary?.passengers ? `${summary.passengers}` : undefined} />
          <RailFact label="Cabin" value={summary?.fareBrand ?? summary?.cabinClass} />
        </dl>
        <FlightPriceBreakdown
          summary={summary}
          ariaLabel="Checkout rail fare breakdown"
          className="mt-4 border-t border-gray-200 pt-4"
          compact
        />
      </section>

      <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase text-gray-500">
          Confirmation
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
          Baha Buddy shows confirmed after payment and airline confirmation are complete.
        </p>
      </section>
    </aside>
  )
}

function RailFact({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200">
      <dt className="text-xs font-bold uppercase text-gray-500">
        {label}
      </dt>
      <dd className="truncate text-right text-xs font-bold text-night">
        {value ?? 'Pending'}
      </dd>
    </div>
  )
}

function FlightPriceBreakdown({
  summary,
  ariaLabel,
  className,
  compact = false,
}: {
  summary?: FlightCheckoutSummary
  ariaLabel: string
  className?: string
  compact?: boolean
}) {
  const currency = summary?.currency ?? 'USD'
  const rows = [
    { label: 'Base fare', value: formatFareAmount(summary?.baseFare, currency) },
    { label: 'Taxes', value: formatFareAmount(summary?.taxes, currency) },
    { label: 'Fees', value: formatFareAmount(summary?.fees, currency) },
    { label: 'Total', value: formatFareAmount(summary?.price, currency, true), total: true },
  ]
  const providerLineItemsAvailable = [summary?.baseFare, summary?.taxes, summary?.fees]
    .every(isNonNegativeAmount)

  return (
    <section aria-label={ariaLabel} className={className}>
      {!compact && (
        <p className="text-xs font-bold uppercase text-gray-500">
          Fare breakdown
        </p>
      )}
      <dl className={compact ? 'space-y-2' : 'mt-3 space-y-2'}>
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between gap-3 ${
              row.total ? 'border-t border-gray-200 pt-2' : ''
            }`}
          >
            <dt className={`${row.total ? 'font-bold text-night' : 'font-semibold text-gray-500'} text-xs`}>
              {row.label}
            </dt>
            <dd className={`${row.total ? 'text-sm font-bold text-night' : 'text-xs font-bold text-charcoal'} text-right`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {!compact && !providerLineItemsAvailable && (
        <p className="mt-3 text-xs font-semibold leading-5 text-gray-500">
          Provider fare line items are unavailable for this offer. The total is the provider&apos;s quoted fare.
        </p>
      )}
    </section>
  )
}

function isNonNegativeAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function formatFareAmount(value: unknown, currency: string, requirePositive = false): string {
  if (!isNonNegativeAmount(value) || (requirePositive && value <= 0)) return 'Unavailable'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(2)}`
  }
}

function itineraryLegsFromSummary(summary: FlightCheckoutSummary): FlightCheckoutLeg[] {
  if (summary.legs?.length) return summary.legs
  return [{
    direction: summary.tripType === 'round_trip' ? 'OUTBOUND' : undefined,
    route: summary.route,
    flightNumber: summary.flightNumber,
    departure: summary.departure,
    arrival: summary.arrival,
    duration: summary.duration,
    stops: summary.stops,
    aircraft: summary.aircraft,
  }].filter((leg) => Boolean(leg.route || leg.flightNumber || leg.departure || leg.arrival || leg.duration || leg.stops))
}

function routeParts(route?: string): [string | undefined, string | undefined] {
  if (!route) return [undefined, undefined]
  const parts = route
    .split(/\s+to\s+|[→>-]/i)
    .map((part) => part.trim())
    .filter(Boolean)
  return [parts[0]?.toUpperCase(), parts[1]?.toUpperCase()]
}

function FlightFareSummary({ summary }: { summary?: FlightCheckoutSummary }) {
  if (!summary) {
    return (
      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-semibold text-night">
          Live fare details are missing from this link.
        </p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Return to flight search and choose a current offer before entering traveler or payment details.
        </p>
      </div>
    )
  }

  const title = [
    summary.airline,
    summary.airlineCode ? `(${summary.airlineCode})` : null,
  ].filter(Boolean).join(' ')
  const airlineLogoUrl = summary.airlineLogoUrl || resolveAirlineLogoUrl({
    airlineCode: summary.airlineCode,
    airlineName: summary.airline,
  })
  const baggage = baggageSummary(summary)
  const rules = typeof summary.refundable === 'boolean'
    ? summary.refundable ? 'Refundable' : 'Non-refundable'
    : undefined
  const itineraryLegs = itineraryLegsFromSummary(summary)
  const hasReturnLeg = itineraryLegs.some((leg) => leg.direction?.toUpperCase() === 'INBOUND')
  const isRoundTrip = summary.tripType === 'round_trip' || hasReturnLeg
  const tripTypeLabel = isRoundTrip ? 'Round trip' : 'Selected flight'

  const facts = [
    { label: 'Cabin', value: summary.fareBrand ?? summary.cabinClass },
    { label: 'Aircraft', value: summary.aircraft },
    { label: 'Baggage', value: baggage },
    { label: 'Rules', value: rules },
    { label: 'Travelers', value: summary.passengers ? `${summary.passengers} traveler${summary.passengers === 1 ? '' : 's'}` : undefined },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value))

  return (
    <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {airlineLogoUrl ? (
            <Image
              src={airlineLogoUrl}
              alt={`${summary.airline ?? 'Airline'} logo`}
              width={56}
              height={40}
              unoptimized
              className="h-10 w-14 shrink-0 object-contain"
            />
          ) : (
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
              {summary.airlineCode ?? 'Air'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-brand-700">{tripTypeLabel}</p>
            <h2 className="mt-1 truncate text-lg font-bold text-night">
              {title || 'Flight option'}
            </h2>
            {summary.route && (
              <p className="mt-1 text-sm font-semibold text-charcoal">
                {summary.route}
              </p>
            )}
          </div>
        </div>
        {summary.expiration && (
          <FareExpiryCountdown expiration={summary.expiration} />
        )}
      </div>

      <div className="mt-4 space-y-3">
        {itineraryLegs.map((leg, index) => (
          <FlightItineraryLeg key={`${leg.direction ?? 'leg'}-${index}`} leg={leg} index={index} isRoundTrip={isRoundTrip} />
        ))}
        {isRoundTrip && !hasReturnLeg && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
            <p className="text-sm font-bold text-night">Return flight</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
              Return details will appear when the airline fare check completes.
            </p>
          </div>
        )}
      </div>

      {facts.length > 0 && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200">
              <dt className="text-xs font-bold uppercase text-gray-500">{fact.label}</dt>
              <dd className="mt-0.5 break-words text-sm font-bold leading-5 text-night">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <FlightPriceBreakdown
        summary={summary}
        ariaLabel="Selected fare breakdown"
        className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
      />

      <p className="mt-3 text-xs font-semibold leading-5 text-gray-500">
        Fare and seat availability are checked again before payment.
      </p>
    </div>
  )
}

function FlightItineraryLeg({
  leg,
  index,
  isRoundTrip,
}: {
  leg: FlightCheckoutLeg
  index: number
  isRoundTrip: boolean
}) {
  const [origin, destination] = routeParts(leg.route)
  const label = leg.direction?.toUpperCase() === 'INBOUND'
    ? 'Return'
    : isRoundTrip
      ? 'Outbound'
      : index === 0
        ? 'Flight'
        : `Flight ${index + 1}`

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-night">{label}</p>
          {leg.flightNumber && (
            <p className="mt-0.5 text-xs font-bold text-brand-700">
              Flight {leg.flightNumber}
            </p>
          )}
          {leg.route && (
            <p className="mt-0.5 text-xs font-semibold text-gray-500">{leg.route}</p>
          )}
          {leg.aircraft && (
            <p className="mt-0.5 text-xs font-semibold text-gray-500">
              Aircraft: {leg.aircraft}
            </p>
          )}
        </div>
        {leg.stops && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-charcoal ring-1 ring-gray-200">
            {leg.stops}
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)_5rem] sm:items-center">
        <div>
          <p className="text-lg font-bold leading-none text-night">{leg.departure ?? '--'}</p>
          {origin && <p className="mt-1 text-xs font-bold uppercase text-gray-500">{origin}</p>}
        </div>
        <div className="flex min-w-0 items-center">
          <div className="relative h-px min-w-12 flex-1 bg-gray-300">
            {leg.duration && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-50 px-2 text-xs font-semibold text-gray-500">
                {leg.duration}
              </span>
            )}
          </div>
          </div>
        <div className="sm:text-right">
          <p className="text-lg font-bold leading-none text-night">{leg.arrival ?? '--'}</p>
          {destination && <p className="mt-1 text-xs font-bold uppercase text-gray-500">{destination}</p>}
        </div>
      </div>
    </div>
  )
}

function FlightPaymentForm({
  tripId,
  offerId,
  prebookId,
  transactionId,
  summary,
  setError,
  setStage,
}: {
  tripId: string
  offerId: string
  prebookId: string
  transactionId: string
  summary?: FlightCheckoutSummary
  setError: (value: string | null) => void
  setStage: (value: CheckoutStage) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) return
    if (!acceptedTerms) {
      setError('Accept the Terms & Conditions and carrier fare rules before payment.')
      return
    }
    setStage('processing')
    setError(null)

    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (error || paymentIntent?.status !== 'succeeded') {
      setError(error?.message ?? 'Payment was not completed.')
      setStage('payment')
      return
    }

    try {
      const result = await postJson('/api/booking/flights/book', {
        offerId,
        prebookId,
        transactionId,
        tripId,
        paymentIntentId: paymentIntent.id,
      })
      ensureLocalBookingSaved(result)
      const bookingId = result.bookingRecordId ?? result.bookingId ?? result.booking_reference ?? prebookId
      const params = new URLSearchParams({
        tripId,
        bookingId: String(bookingId),
      })
      window.location.href = `/flights/${encodeURIComponent(offerId)}/confirmation?${params.toString()}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment succeeded, but the booking needs support. Contact support with your payment reference.')
      setStage('error')
    }
  }

  return (
    <form onSubmit={submitPayment} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <PaymentElement options={{ layout: 'tabs' }} />
      <FlightPrivacyDisclosure context="payment" />
      <CarrierFareRules summary={summary} />
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <input
          id="flight-booking-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <div>
          <label htmlFor="flight-booking-terms" className="text-sm font-semibold leading-6 text-night">
            I agree to the booking terms and acknowledge the carrier fare rules for this fare.
          </label>
          <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
            Review the{' '}
            <Link href="/terms" target="_blank" className="text-brand-700 underline underline-offset-2">
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <a href="#carrier-fare-rules" className="text-brand-700 underline underline-offset-2">
              Carrier fare rules
            </a>
            .
          </p>
        </div>
      </div>
      <button type="submit" disabled={!stripe || !elements || !acceptedTerms} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
        Pay and confirm flight
      </button>
    </form>
  )
}

function FlightPrivacyDisclosure({ context }: { context: 'traveler' | 'payment' }) {
  const isPayment = context === 'payment'

  return (
    <aside
      aria-label={isPayment ? 'Payment data privacy disclosure' : 'Traveler data privacy disclosure'}
      className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3"
    >
      <p className="text-sm font-bold text-night">
        {isPayment ? 'Your data at payment' : 'How we use traveler data'}
      </p>
      <p className="mt-1 text-xs font-semibold leading-5 text-charcoal">
        {isPayment
          ? 'By continuing to payment, you acknowledge that traveler data is processed as described in our Privacy Policy. Card details are handled securely by Stripe and are not stored by Baha Buddy.'
          : 'Baha Buddy processes each traveler’s identity, contact, date of birth, nationality, and passport details to verify and fulfill this booking. We share only the required data with the airline and booking provider.'}
      </p>
      <Link
        href="/privacy"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex text-xs font-bold text-brand-700 underline underline-offset-2"
      >
        Read the Privacy Policy
      </Link>
    </aside>
  )
}

function CarrierFareRules({ summary }: { summary?: FlightCheckoutSummary }) {
  const cancellation = typeof summary?.refundable === 'boolean'
    ? summary.refundable
      ? 'Refundable; carrier deadlines and fees may apply'
      : 'Non-refundable'
    : 'Confirmed with the carrier before payment'
  const changes = typeof summary?.changeable === 'boolean'
    ? summary.changeable
      ? 'Changes allowed; carrier fees and fare differences may apply'
      : 'Changes are not allowed'
    : 'Confirmed with the carrier before payment'
  const baggage = baggageSummary(summary) ?? 'Confirmed with the carrier before payment'

  return (
    <section id="carrier-fare-rules" className="mt-6 scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-4" tabIndex={-1}>
      <p className="text-xs font-bold uppercase text-brand-700">Carrier conditions</p>
      <h2 className="mt-1 text-base font-bold text-night">
        {summary?.airline ? `${summary.airline} fare rules` : 'Carrier fare rules'}
      </h2>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <FareRuleFact label="Cancellation" value={cancellation} />
        <FareRuleFact label="Changes" value={changes} />
        <FareRuleFact label="Baggage" value={baggage} />
      </dl>
      <p className="mt-3 text-xs font-semibold leading-5 text-gray-500">
        The carrier’s verified conditions govern changes, cancellations, no-shows, and baggage. Baha Buddy rechecks the fare before payment.
      </p>
    </section>
  )
}

function FareRuleFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
      <dt className="text-xs font-bold uppercase text-gray-500">{label}</dt>
      <dd className="mt-1 text-xs font-semibold leading-5 text-charcoal">{value}</dd>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <TravelSearchField label={label} htmlFor={htmlFor}>
      {children}
    </TravelSearchField>
  )
}

async function addFlightToTrip(
  tripId: string,
  offerId: string,
  verification: Record<string, unknown> | null,
  summary?: FlightCheckoutSummary,
) {
  const routeCodes = routeCodesFromSummary(summary)
  const verifiedPrice = numberValue(verification?.price)
  const summaryPrice = numberValue(summary?.price)
  await postJson(`/api/trips/${encodeURIComponent(tripId)}/items`, {
    itemType: 'flight',
    sourceId: offerId,
    sourceType: 'web_flight_booking',
    name: flightItemName(offerId, summary),
    provider: 'liteapi',
    providerOfferId: offerId,
    origin: stringValue(verification?.origin) ?? routeCodes.origin,
    destination: stringValue(verification?.destination) ?? routeCodes.destination,
    departureAt: stringValue(verification?.departure_at),
    arrivalAt: stringValue(verification?.arrival_at),
    airline: stringValue(verification?.airline) ?? summary?.airline,
    price: verifiedPrice ?? summaryPrice,
    currency: String(verification?.currency ?? summary?.currency ?? 'USD'),
    metadata: {
      route: summary?.route,
      duration: summary?.duration,
      stops: summary?.stops,
      cabinClass: summary?.cabinClass,
      fareBrand: summary?.fareBrand,
      refundable: summary?.refundable,
      baggage: baggageSummary(summary),
    },
  })
}

function flightItemName(offerId: string, summary?: FlightCheckoutSummary): string {
  const route = summary?.route
  const airline = summary?.airline
  if (route && airline) return `${airline} ${route}`
  if (route) return `Flight ${route}`
  if (airline) return `${airline} flight`
  return `Flight offer ${shortOfferId(offerId)}`
}

function baggageSummary(summary?: FlightCheckoutSummary): string | undefined {
  if (!summary) return undefined
  const allowances = summary.baggageAllowances
    ?.map((allowance) => {
      const bagType = allowance.type === 'carry_on'
        ? 'carry-on'
        : allowance.type === 'checked'
          ? 'checked bag'
          : undefined
      if (!bagType) return allowance.description
      if (allowance.weightKg) {
        const pieces = allowance.pieces ?? 1
        return `${pieces} × ${formatAllowanceNumber(allowance.weightKg)} kg ${bagType}${allowance.dimensions ? ` · ${allowance.dimensions}` : ''}`
      }
      if (allowance.dimensions) {
        return `${allowance.pieces ? `${allowance.pieces} × ` : ''}${bagType} · ${allowance.dimensions}`
      }
      return allowance.description ?? `${allowance.pieces ?? 1} ${bagType}`
    })
    .filter((allowance): allowance is string => Boolean(allowance))
  if (allowances?.length) return Array.from(new Set(allowances)).join(' + ')

  const parts: string[] = []
  if (summary.carryOn) parts.push('Carry-on')
  if (summary.checkedBags && summary.checkedBags > 0) {
    parts.push(`${summary.checkedBags} checked`)
  }
  return parts.length > 0 ? parts.join(' + ') : undefined
}

function formatAllowanceNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, '').replace(/\.$/, '')
}

function shortOfferId(value: string): string {
  if (value.length <= 28) return value
  return `${value.slice(0, 18)}...${value.slice(-6)}`
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function flightCheckoutErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/provider request failed with status 400/i.test(message)) {
    return 'This fare could not be verified. It may have expired or changed. Return to flight search and choose a current fare.'
  }
  if (/expired|not found|session/i.test(message)) {
    return 'This fare is no longer available. Return to flight search and choose a current fare.'
  }
  return message || 'Could not start flight checkout.'
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Request failed.')
  return data
}

function ensureLocalBookingSaved(result: Record<string, unknown>) {
  if (
    result.localStatus === 'failed'
    || !result.bookingRecordId
    || !result.tripItemId
  ) {
    throw new Error('Payment succeeded, but this booking needs support before it can be shown as confirmed. Contact support with your payment reference.')
  }
}
