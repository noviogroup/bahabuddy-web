import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'

export type VendorRole = 'owner' | 'editor' | 'viewer'
export type VendorAccessStatus = 'active' | 'disabled'

export type VendorPartner = {
  id: string
  name: string
  slug: string | null
  partner_type: string
  tier: string
  status: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  island_name: string | null
  description: string | null
  is_featured: boolean
  is_sponsored: boolean
}

export type VendorMembership = {
  id: string
  partner_id: string
  auth_user_id: string
  email: string
  role: VendorRole
  status: VendorAccessStatus
  created_at: string
  updated_at: string
  partner: VendorPartner | null
}

export type VendorInvite = {
  id: string
  partner_id: string
  email: string
  role: VendorRole
  status: string
  created_at: string
  partner?: VendorPartner | null
}

export type VendorPortalState =
  | { kind: 'unauthenticated'; user: null }
  | { kind: 'service_unavailable'; user: User }
  | {
      kind: 'ready'
      user: User
      memberships: VendorMembership[]
      activeMemberships: VendorMembership[]
      disabledMemberships: VendorMembership[]
      pendingInvites: VendorInvite[]
    }

export type VendorAccessResult =
  | { ok: true; user: User; membership: VendorMembership; memberships: VendorMembership[] }
  | { ok: false; status: 401 | 403 | 503; code: string; message: string; state?: VendorPortalState }

export type VendorListing = {
  id: string
  partner_id: string
  place_id: string
  relationship_type: string
  created_at: string
  place: {
    id: string
    name: string
    category: string | null
    island_name: string | null
    status: string | null
    is_active: boolean | null
    rating: number | null
    review_count: number | null
    primary_image_url: string | null
    updated_at: string | null
  } | null
}

export type VendorPerformance = {
  partnerId: string
  linkedPlaces: number
  totalLeads: number
  convertedLeads: number
  campaigns: number
  campaignRevenue: number
  paidPayouts: number
  pendingProfileSubmissions: number
  pendingDealSubmissions: number
  pendingPhotoSubmissions: number
}

export type VendorDashboardData = {
  membership: VendorMembership
  memberships: VendorMembership[]
  listings: VendorListing[]
  performance: VendorPerformance
  pendingSubmissions: Array<{
    id: string
    type: 'profile' | 'deal' | 'photo'
    title: string
    detail: string
    status: string
    createdAt: string
  }>
}

const ACTIVE_PARTNER_STATUS = 'active'

function normalizePartner(value: unknown): VendorPartner | null {
  if (!value) return null
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const partner = row as Record<string, unknown>
  return {
    id: String(partner.id ?? ''),
    name: String(partner.name ?? ''),
    slug: typeof partner.slug === 'string' ? partner.slug : null,
    partner_type: String(partner.partner_type ?? 'vendor'),
    tier: String(partner.tier ?? 'standard'),
    status: String(partner.status ?? ''),
    contact_name: typeof partner.contact_name === 'string' ? partner.contact_name : null,
    contact_email: typeof partner.contact_email === 'string' ? partner.contact_email : null,
    contact_phone: typeof partner.contact_phone === 'string' ? partner.contact_phone : null,
    website: typeof partner.website === 'string' ? partner.website : null,
    island_name: typeof partner.island_name === 'string' ? partner.island_name : null,
    description: typeof partner.description === 'string' ? partner.description : null,
    is_featured: partner.is_featured === true,
    is_sponsored: partner.is_sponsored === true,
  }
}

function normalizeMembership(row: Record<string, unknown>): VendorMembership {
  return {
    id: String(row.id),
    partner_id: String(row.partner_id),
    auth_user_id: String(row.auth_user_id),
    email: String(row.email ?? ''),
    role: (row.role === 'owner' || row.role === 'editor' || row.role === 'viewer' ? row.role : 'viewer') as VendorRole,
    status: (row.status === 'active' ? 'active' : 'disabled') as VendorAccessStatus,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    partner: normalizePartner(row.partners),
  }
}

function normalizeInvite(row: Record<string, unknown>): VendorInvite {
  return {
    id: String(row.id),
    partner_id: String(row.partner_id),
    email: String(row.email ?? ''),
    role: (row.role === 'owner' || row.role === 'editor' || row.role === 'viewer' ? row.role : 'viewer') as VendorRole,
    status: String(row.status ?? 'pending'),
    created_at: String(row.created_at ?? ''),
    partner: normalizePartner(row.partners),
  }
}

function isActiveMembership(membership: VendorMembership): boolean {
  return membership.status === 'active' && membership.partner?.status === ACTIVE_PARTNER_STATUS
}

export function chooseVendorMembership(
  memberships: VendorMembership[],
  requestedPartnerId?: string | null,
): VendorMembership | null {
  const active = memberships.filter(isActiveMembership)
  if (!requestedPartnerId) return active[0] ?? null
  return active.find((membership) => membership.partner_id === requestedPartnerId) ?? null
}

export async function getVendorPortalState(): Promise<VendorPortalState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { kind: 'unauthenticated', user: null }

  const admin = createAdminClient()
  if (!admin) return { kind: 'service_unavailable', user }

  const email = (user.email ?? '').toLowerCase()
  const membershipsPromise = admin
    .from('partner_users')
    .select('id,partner_id,auth_user_id,email,role,status,created_at,updated_at,partners(id,name,slug,partner_type,tier,status,contact_name,contact_email,contact_phone,website,island_name,description,is_featured,is_sponsored)')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: true })

  const invitesPromise = email
    ? admin
        .from('partner_user_invites')
        .select('id,partner_id,email,role,status,created_at,partners(id,name,slug,partner_type,tier,status,contact_name,contact_email,contact_phone,website,island_name,description,is_featured,is_sponsored)')
        .eq('email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  const [membershipsRes, invitesRes] = await Promise.all([membershipsPromise, invitesPromise])
  if (membershipsRes.error) throw membershipsRes.error
  if (invitesRes.error) throw invitesRes.error

  const memberships = ((membershipsRes.data ?? []) as Array<Record<string, unknown>>).map(normalizeMembership)
  const pendingInvites = ((invitesRes.data ?? []) as Array<Record<string, unknown>>).map(normalizeInvite)

  return {
    kind: 'ready',
    user,
    memberships,
    activeMemberships: memberships.filter(isActiveMembership),
    disabledMemberships: memberships.filter((membership) => !isActiveMembership(membership)),
    pendingInvites,
  }
}

export async function requireActiveVendorAccess(
  requestedPartnerId?: string | null,
): Promise<VendorAccessResult> {
  const state = await getVendorPortalState()
  if (state.kind === 'unauthenticated') {
    return { ok: false, status: 401, code: 'NOT_AUTHENTICATED', message: 'Sign in to access the vendor portal.', state }
  }
  if (state.kind === 'service_unavailable') {
    return { ok: false, status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Vendor portal service configuration is unavailable.', state }
  }

  const membership = chooseVendorMembership(state.memberships, requestedPartnerId)
  if (!membership) {
    return {
      ok: false,
      status: 403,
      code: 'VENDOR_ACCESS_REQUIRED',
      message: 'Active partner access is required for the vendor portal.',
      state,
    }
  }

  return { ok: true, user: state.user, membership, memberships: state.activeMemberships }
}

export function vendorPartnerIds(memberships: VendorMembership[]): string[] {
  return memberships.map((membership) => membership.partner_id)
}

function normalizePlace(value: unknown): VendorListing['place'] {
  if (!value) return null
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const place = row as Record<string, unknown>
  return {
    id: String(place.id ?? ''),
    name: String(place.name ?? ''),
    category: typeof place.category === 'string' ? place.category : null,
    island_name: typeof place.island_name === 'string' ? place.island_name : null,
    status: typeof place.status === 'string' ? place.status : null,
    is_active: typeof place.is_active === 'boolean' ? place.is_active : null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    review_count: typeof place.review_count === 'number' ? place.review_count : null,
    primary_image_url: typeof place.primary_image_url === 'string' ? place.primary_image_url : null,
    updated_at: typeof place.updated_at === 'string' ? place.updated_at : null,
  }
}

export async function fetchVendorListings(partnerIds: string[]): Promise<VendorListing[]> {
  if (partnerIds.length === 0) return []
  const admin = createAdminClient()
  if (!admin) return []

  const { data, error } = await admin
    .from('partner_places')
    .select('id,partner_id,place_id,relationship_type,created_at,places(id,name,category,island_name,status,is_active,rating,review_count,primary_image_url,updated_at)')
    .in('partner_id', partnerIds)
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    partner_id: String(row.partner_id),
    place_id: String(row.place_id),
    relationship_type: String(row.relationship_type ?? 'owner_operator'),
    created_at: String(row.created_at ?? ''),
    place: normalizePlace(row.places),
  }))
}

export async function ensurePartnerPlaceLink(partnerId: string, placeId: string): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) return false
  const { data, error } = await admin
    .from('partner_places')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('place_id', placeId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function fetchVendorPerformance(partnerId: string): Promise<VendorPerformance> {
  const admin = createAdminClient()
  if (!admin) {
    return {
      partnerId,
      linkedPlaces: 0,
      totalLeads: 0,
      convertedLeads: 0,
      campaigns: 0,
      campaignRevenue: 0,
      paidPayouts: 0,
      pendingProfileSubmissions: 0,
      pendingDealSubmissions: 0,
      pendingPhotoSubmissions: 0,
    }
  }

  const performancePromise = admin
    .from('v_partner_performance')
    .select('id,linked_places,total_leads,converted_leads,campaigns,campaign_revenue,paid_payouts')
    .eq('id', partnerId)
    .maybeSingle()

  const profileCountPromise = admin
    .from('partner_profile_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('status', 'pending')

  const dealCountPromise = admin
    .from('partner_deal_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('status', 'pending')

  const photoCountPromise = admin
    .from('partner_photo_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('status', 'pending')

  const [performanceRes, profileCount, dealCount, photoCount] = await Promise.all([
    performancePromise,
    profileCountPromise,
    dealCountPromise,
    photoCountPromise,
  ])

  if (performanceRes.error) throw performanceRes.error
  if (profileCount.error) throw profileCount.error
  if (dealCount.error) throw dealCount.error
  if (photoCount.error) throw photoCount.error

  const row = (performanceRes.data ?? {}) as Record<string, unknown>
  return {
    partnerId,
    linkedPlaces: Number(row.linked_places ?? 0),
    totalLeads: Number(row.total_leads ?? 0),
    convertedLeads: Number(row.converted_leads ?? 0),
    campaigns: Number(row.campaigns ?? 0),
    campaignRevenue: Number(row.campaign_revenue ?? 0),
    paidPayouts: Number(row.paid_payouts ?? 0),
    pendingProfileSubmissions: profileCount.count ?? 0,
    pendingDealSubmissions: dealCount.count ?? 0,
    pendingPhotoSubmissions: photoCount.count ?? 0,
  }
}

export async function fetchPendingVendorSubmissions(partnerId: string): Promise<VendorDashboardData['pendingSubmissions']> {
  const admin = createAdminClient()
  if (!admin) return []

  const [profiles, deals, photos] = await Promise.all([
    admin
      .from('partner_profile_submissions')
      .select('id,status,proposed_data,note,created_at')
      .eq('partner_id', partnerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('partner_deal_submissions')
      .select('id,status,proposed_data,note,created_at')
      .eq('partner_id', partnerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('partner_photo_submissions')
      .select('id,status,alt,type,submitted_at,file_name')
      .eq('partner_id', partnerId)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })
      .limit(5),
  ])

  if (profiles.error) throw profiles.error
  if (deals.error) throw deals.error
  if (photos.error) throw photos.error

  const profileItems = ((profiles.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    type: 'profile' as const,
    title: 'Profile update request',
    detail: typeof row.note === 'string' && row.note ? row.note : 'Business profile changes',
    status: String(row.status ?? 'pending'),
    createdAt: String(row.created_at ?? ''),
  }))

  const dealItems = ((deals.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const data = (row.proposed_data ?? {}) as Record<string, unknown>
    return {
      id: String(row.id),
      type: 'deal' as const,
      title: typeof data.title === 'string' ? data.title : 'Deal proposal',
      detail: typeof row.note === 'string' && row.note ? row.note : 'Pending admin review',
      status: String(row.status ?? 'pending'),
      createdAt: String(row.created_at ?? ''),
    }
  })

  const photoItems = ((photos.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    type: 'photo' as const,
    title: 'Photo submission',
    detail: typeof row.file_name === 'string' && row.file_name ? row.file_name : String(row.alt ?? 'New media upload'),
    status: String(row.status ?? 'pending'),
    createdAt: String(row.submitted_at ?? ''),
  }))

  return [...profileItems, ...dealItems, ...photoItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
}

export async function fetchVendorDashboardData(partnerId?: string | null): Promise<VendorDashboardData | null> {
  const access = await requireActiveVendorAccess(partnerId)
  if (!access.ok) return null
  const partnerIds = vendorPartnerIds(access.memberships)
  const [listings, performance, pendingSubmissions] = await Promise.all([
    fetchVendorListings([access.membership.partner_id]),
    fetchVendorPerformance(access.membership.partner_id),
    fetchPendingVendorSubmissions(access.membership.partner_id),
  ])

  return {
    membership: access.membership,
    memberships: access.memberships.filter((membership) => partnerIds.includes(membership.partner_id)),
    listings,
    performance,
    pendingSubmissions,
  }
}

export function cleanText(value: unknown, maxLength = 400): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export function cleanUrl(value: unknown): string | null {
  const text = cleanText(value, 500)
  if (!text) return null
  try {
    const url = new URL(text)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function cleanNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function cleanIsoDate(value: unknown): string | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}
