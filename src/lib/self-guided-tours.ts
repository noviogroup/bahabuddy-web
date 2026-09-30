/**
 * Self-guided tour catalog + entitlement helpers (web).
 *
 * Backend contract (Baha-Buddy-V2 migration
 * 20260929120000_self_guided_catalog_and_entitlements.sql):
 *   - `v_self_guided_catalog` lists active tours with price_cents (0 = free),
 *     stop_count and preview_stop_count. Rows with source_table
 *     'self_tours' are the island routes sold through this flow; cruise
 *     itineraries keep their own purchase path (/nassau-cruise-itineraries).
 *   - `tour_entitlements` is owner-readable (RLS) and written only by the
 *     server: `claim_free_self_tour(p_tour_id)` for free tours and
 *     stripe-webhook after a verified payment for priced tours.
 *   - `tour_stops` RLS exposes stops up to preview_stop_count to everyone.
 *
 * Entitlements belong to the Supabase auth user, so a tour claimed or bought
 * here appears in the mobile app when the traveler signs in with the same
 * account.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const SELF_TOUR_SOURCE_TABLE = 'self_tours'
export const DEFAULT_PREVIEW_STOP_COUNT = 2

export interface SelfGuidedCatalogTour {
  id: string
  kind: string | null
  source_table: string
  title: string
  island: string | null
  duration_minutes: number | null
  price_cents: number
  currency: string
  cover_image_url: string | null
  stop_count: number | null
  preview_stop_count: number | null
  cruise_friendly: boolean | null
  featured: boolean | null
}

export interface TourPreviewStop {
  id: string
  sequence: number
  name: string
  description: string | null
  duration_sec: number | null
}

export interface TourEntitlementRow {
  id: string
  tour_id: string
  source: string
  price_paid_cents: number
  currency: string
  granted_at: string
}

const CATALOG_COLUMNS =
  'id, kind, source_table, title, island, duration_minutes, price_cents, currency, cover_image_url, stop_count, preview_stop_count, cruise_friendly, featured'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isTourId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim())
}

// ─── Labels ────────────────────────────────────────────────────────────

export function normalizePriceCents(value: unknown): number {
  const cents = Number(value)
  return Number.isFinite(cents) && cents > 0 ? Math.round(cents) : 0
}

export function isFreeTour(priceCents: unknown): boolean {
  return normalizePriceCents(priceCents) === 0
}

/** "Free" for 0, otherwise the exact amount, e.g. "$4.99" / "$12.00". */
export function tourPriceLabel(priceCents: unknown, currency: string | null | undefined = 'USD'): string {
  const cents = normalizePriceCents(priceCents)
  if (cents === 0) return 'Free'
  const code = (currency ?? 'USD').trim().toUpperCase() || 'USD'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`
  }
}

export function tourDurationLabel(minutes: unknown): string | null {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return null
  if (value < 60) return `${Math.round(value)} min`
  const hours = Number((value / 60).toFixed(1))
  return `${hours} hr`
}

export function tourStopCountLabel(count: unknown): string | null {
  const value = Number(count)
  if (!Number.isFinite(value) || value <= 0) return null
  return `${value} ${value === 1 ? 'stop' : 'stops'}`
}

export function previewStopLimit(tour: Pick<SelfGuidedCatalogTour, 'preview_stop_count'>): number {
  if (tour.preview_stop_count == null) return DEFAULT_PREVIEW_STOP_COUNT
  const value = Number(tour.preview_stop_count)
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : DEFAULT_PREVIEW_STOP_COUNT
}

// ─── CTA state ─────────────────────────────────────────────────────────

export type TourCtaState =
  | 'loading'
  | 'sign_in'
  | 'account_required'
  | 'owned'
  | 'claim_free'
  | 'buy'

export interface TourCtaInput {
  /** Auth has not resolved yet. */
  authLoading: boolean
  signedIn: boolean
  /** Supabase anonymous (guest) session — cannot hold a portable account. */
  isAnonymous?: boolean
  /** null while the entitlement lookup is still running. */
  owned: boolean | null
  priceCents: unknown
}

/**
 * Decides which call to action a tour shows. Ownership wins over price so a
 * grandfathered tour never asks to be bought again.
 */
export function resolveTourCta(input: TourCtaInput): TourCtaState {
  if (input.authLoading) return 'loading'
  if (!input.signedIn) return 'sign_in'
  if (input.isAnonymous) return 'account_required'
  if (input.owned === null) return 'loading'
  if (input.owned) return 'owned'
  return isFreeTour(input.priceCents) ? 'claim_free' : 'buy'
}

export function tourLoginHref(tourId: string, mode: 'signin' | 'signup' = 'signin'): string {
  const params = new URLSearchParams()
  if (mode === 'signup') params.set('mode', 'signup')
  params.set('redirect', `/tours/${tourId}`)
  return `/login?${params.toString()}`
}

// ─── Checkout errors (stripe-payment booking_type 'self_tour') ─────────

export type CheckoutErrorAction = 'owned' | 'claim_free' | 'account_required' | 'in_progress' | 'error'

export function classifyCheckoutError(status: number | undefined, code: string | undefined): CheckoutErrorAction {
  if (code === 'ALREADY_ENTITLED') return 'owned'
  if (code === 'FREE_ENTITLEMENT_REQUIRED') return 'claim_free'
  if (code === 'ACCOUNT_REQUIRED' || status === 401) return 'account_required'
  if (code === 'PAYMENT_IN_PROGRESS') return 'in_progress'
  return 'error'
}

export function checkoutErrorMessage(action: CheckoutErrorAction): string {
  switch (action) {
    case 'owned':
      return 'This tour is already in your account.'
    case 'claim_free':
      return 'This tour is now free. Add it to your tours instead.'
    case 'account_required':
      return 'Sign in with an email account to buy this tour.'
    case 'in_progress':
      return 'A payment for this tour is already processing. We will add the tour as soon as it clears.'
    default:
      return 'We could not start checkout. Please try again in a moment.'
  }
}

// ─── Entitlement polling ───────────────────────────────────────────────

export type PollOutcome = 'granted' | 'timeout' | 'aborted'

export interface PollOptions {
  /** Returns true once the entitlement exists. Errors count as "not yet". */
  check: () => Promise<boolean>
  intervalMs?: number
  timeoutMs?: number
  signal?: AbortSignal
  /** Injected for tests. */
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Polls until the webhook has granted the entitlement. The first check runs
 * immediately; later checks back off gently up to 5s between attempts.
 */
export async function pollForEntitlement({
  check,
  intervalMs = 1500,
  timeoutMs = 60_000,
  signal,
  sleep = defaultSleep,
  now = Date.now,
}: PollOptions): Promise<PollOutcome> {
  const deadline = now() + timeoutMs
  let delay = intervalMs
  for (;;) {
    if (signal?.aborted) return 'aborted'
    let granted = false
    try {
      granted = await check()
    } catch {
      granted = false
    }
    if (signal?.aborted) return 'aborted'
    if (granted) return 'granted'
    if (now() + delay > deadline) return 'timeout'
    await sleep(delay)
    delay = Math.min(Math.round(delay * 1.5), 5000)
  }
}

// ─── Data access ───────────────────────────────────────────────────────

function toCatalogTour(row: Record<string, unknown>): SelfGuidedCatalogTour {
  return {
    id: String(row.id),
    kind: (row.kind as string | null) ?? null,
    source_table: String(row.source_table ?? SELF_TOUR_SOURCE_TABLE),
    title: String(row.title ?? 'Self-guided tour'),
    island: (row.island as string | null) ?? null,
    duration_minutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
    price_cents: normalizePriceCents(row.price_cents),
    currency: String(row.currency ?? 'USD').toUpperCase(),
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    stop_count: row.stop_count == null ? null : Number(row.stop_count),
    preview_stop_count: row.preview_stop_count == null ? null : Number(row.preview_stop_count),
    cruise_friendly: (row.cruise_friendly as boolean | null) ?? null,
    featured: (row.featured as boolean | null) ?? null,
  }
}

export async function getSelfGuidedCatalog(supabase: SupabaseClient): Promise<SelfGuidedCatalogTour[]> {
  const { data, error } = await supabase
    .from('v_self_guided_catalog')
    .select(CATALOG_COLUMNS)
    .eq('source_table', SELF_TOUR_SOURCE_TABLE)
    .order('featured', { ascending: false })
    .order('title', { ascending: true })
  if (error || !Array.isArray(data)) return []
  return (data as Record<string, unknown>[]).map(toCatalogTour)
}

export async function getCatalogTour(
  supabase: SupabaseClient,
  tourId: string,
): Promise<SelfGuidedCatalogTour | null> {
  if (!isTourId(tourId)) return null
  const { data, error } = await supabase
    .from('v_self_guided_catalog')
    .select(CATALOG_COLUMNS)
    .eq('source_table', SELF_TOUR_SOURCE_TABLE)
    .eq('id', tourId)
    .maybeSingle()
  if (error || !data) return null
  return toCatalogTour(data as Record<string, unknown>)
}

export async function getCatalogToursByIds(
  supabase: SupabaseClient,
  tourIds: string[],
): Promise<SelfGuidedCatalogTour[]> {
  const ids = tourIds.filter(isTourId)
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('v_self_guided_catalog')
    .select(CATALOG_COLUMNS)
    .eq('source_table', SELF_TOUR_SOURCE_TABLE)
    .in('id', ids)
  if (error || !Array.isArray(data)) return []
  return (data as Record<string, unknown>[]).map(toCatalogTour)
}

/** Public preview stops (sequence <= preview_stop_count, matching RLS). */
export async function getPreviewStops(
  supabase: SupabaseClient,
  tour: Pick<SelfGuidedCatalogTour, 'id' | 'preview_stop_count'>,
): Promise<TourPreviewStop[]> {
  const limit = previewStopLimit(tour)
  if (limit === 0 || !isTourId(tour.id)) return []
  const { data, error } = await supabase
    .from('tour_stops')
    .select('id, sequence, name, description, duration_sec')
    .eq('tour_id', tour.id)
    .lte('sequence', limit)
    .order('sequence', { ascending: true })
    .limit(limit)
  if (error || !Array.isArray(data)) return []
  return data as TourPreviewStop[]
}

/** Active (non-revoked) entitlement check for the signed-in user. */
export async function hasTourEntitlement(supabase: SupabaseClient, tourId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('tour_entitlements')
    .select('id')
    .eq('tour_id', tourId)
    .is('revoked_at', null)
    .limit(1)
  if (error) throw new Error(error.message)
  return Array.isArray(data) && data.length > 0
}

export async function getOwnedTourIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('tour_entitlements')
    .select('tour_id')
    .is('revoked_at', null)
  if (error || !Array.isArray(data)) return []
  return (data as Array<{ tour_id: string }>).map((row) => row.tour_id)
}

export async function getMyTourEntitlements(supabase: SupabaseClient): Promise<TourEntitlementRow[]> {
  const { data, error } = await supabase
    .from('tour_entitlements')
    .select('id, tour_id, source, price_paid_cents, currency, granted_at')
    .is('revoked_at', null)
    .order('granted_at', { ascending: false })
  if (error || !Array.isArray(data)) return []
  return data as TourEntitlementRow[]
}

export function entitlementSourceLabel(row: Pick<TourEntitlementRow, 'source' | 'price_paid_cents' | 'currency'>): string {
  if (row.source === 'stripe') return `Purchased · ${tourPriceLabel(row.price_paid_cents, row.currency)}`
  if (row.source === 'free') return 'Added free'
  return 'Included with your account'
}
