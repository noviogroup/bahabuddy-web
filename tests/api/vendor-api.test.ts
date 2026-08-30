import { beforeEach, describe, expect, test, vi } from 'vitest'

const accessOk = {
  ok: true,
  user: { id: 'user-1', email: 'vendor@example.com' },
  membership: { partner_id: 'partner-1', id: 'membership-1' },
  memberships: [{ partner_id: 'partner-1', id: 'membership-1' }],
}

const mockRequireActiveVendorAccess = vi.fn()
const mockFetchVendorListings = vi.fn()
const mockFetchVendorPerformance = vi.fn()
const mockEnsurePartnerPlaceLink = vi.fn()

vi.mock('@/lib/vendor-portal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/vendor-portal')>()
  return {
    ...actual,
    requireActiveVendorAccess: (...args: unknown[]) => mockRequireActiveVendorAccess(...args),
    fetchVendorListings: (...args: unknown[]) => mockFetchVendorListings(...args),
    fetchVendorPerformance: (...args: unknown[]) => mockFetchVendorPerformance(...args),
    ensurePartnerPlaceLink: (...args: unknown[]) => mockEnsurePartnerPlaceLink(...args),
  }
})

let fromCalls: string[] = []
let insertCalls: Array<{ table: string; payload: unknown }> = []
let uploadCalls: unknown[] = []

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromCalls.push(table)
      const chain: any = {
        insert: vi.fn((payload) => {
          insertCalls.push({ table, payload })
          return chain
        }),
        select: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: { id: `${table}-sub-1` }, error: null }),
      }
      return chain
    },
    storage: {
      from: () => ({
        upload: vi.fn((...args) => {
          uploadCalls.push(args)
          return Promise.resolve({ error: null })
        }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://cdn.example/photo.jpg' } })),
      }),
    },
  }),
}))

import { GET as getMe } from '@/app/api/vendor/me/route'
import { GET as getListings } from '@/app/api/vendor/listings/route'
import { POST as postProfile } from '@/app/api/vendor/profile-submissions/route'
import { POST as postDeal } from '@/app/api/vendor/deals/route'
import { POST as postPhoto } from '@/app/api/vendor/photos/route'

function request(path: string, init?: RequestInit) {
  return new Request(`http://localhost.test${path}`, init)
}

beforeEach(() => {
  mockRequireActiveVendorAccess.mockReset()
  mockFetchVendorListings.mockReset()
  mockFetchVendorPerformance.mockReset()
  mockEnsurePartnerPlaceLink.mockReset()
  fromCalls = []
  insertCalls = []
  uploadCalls = []
})

describe('vendor API auth and scope', () => {
  test('returns 401 when the vendor is unauthenticated', async () => {
    mockRequireActiveVendorAccess.mockResolvedValue({
      ok: false,
      status: 401,
      code: 'NOT_AUTHENTICATED',
      message: 'Sign in',
    })

    const response = await getMe()
    expect(response.status).toBe(401)
  })

  test('returns 403 when the vendor has no active membership', async () => {
    mockRequireActiveVendorAccess.mockResolvedValue({
      ok: false,
      status: 403,
      code: 'VENDOR_ACCESS_REQUIRED',
      message: 'Active partner access is required',
    })

    const response = await getMe()
    expect(response.status).toBe(403)
  })

  test('does not fetch listings when requested partner scope is not owned', async () => {
    mockRequireActiveVendorAccess.mockResolvedValue({
      ok: false,
      status: 403,
      code: 'VENDOR_ACCESS_REQUIRED',
      message: 'Active partner access is required',
    })

    const response = await getListings(request('/api/vendor/listings?partner_id=other-partner'))
    expect(response.status).toBe(403)
    expect(mockRequireActiveVendorAccess).toHaveBeenCalledWith('other-partner')
    expect(mockFetchVendorListings).not.toHaveBeenCalled()
  })
})

describe('vendor submissions stay pending', () => {
  test('profile submissions insert pending rows without touching canonical partners', async () => {
    mockRequireActiveVendorAccess.mockResolvedValue(accessOk)

    const response = await postProfile(request('/api/vendor/profile-submissions', {
      method: 'POST',
      body: JSON.stringify({ partner_id: 'partner-1', name: 'New Resort Name', description: 'Updated copy' }),
    }))

    expect(response.status).toBe(201)
    expect(fromCalls).toEqual(['partner_profile_submissions'])
    expect(insertCalls[0].payload).toMatchObject({
      partner_id: 'partner-1',
      status: 'pending',
      proposed_data: { name: 'New Resort Name', description: 'Updated copy' },
    })
  })

  test('deal submissions insert pending rows without creating canonical deals', async () => {
    mockRequireActiveVendorAccess.mockResolvedValue(accessOk)
    mockEnsurePartnerPlaceLink.mockResolvedValue(true)

    const response = await postDeal(request('/api/vendor/deals', {
      method: 'POST',
      body: JSON.stringify({ partner_id: 'partner-1', title: 'Summer Escape', description: 'Stay longer in Nassau.', place_id: 'place-1' }),
    }))

    expect(response.status).toBe(201)
    expect(mockEnsurePartnerPlaceLink).toHaveBeenCalledWith('partner-1', 'place-1')
    expect(fromCalls).toEqual(['partner_deal_submissions'])
    expect(insertCalls[0].payload).toMatchObject({ partner_id: 'partner-1', status: 'pending' })
  })

  test('photo uploads validate scope, upload server-side, and create pending photo submissions', async () => {
    mockRequireActiveVendorAccess.mockResolvedValue(accessOk)
    mockEnsurePartnerPlaceLink.mockResolvedValue(true)

    const file = {
      name: 'pool.png',
      type: 'image/png',
      size: 5,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(5)),
    }
    const form = {
      get: (key: string) => ({
        partner_id: 'partner-1',
        place_id: 'place-1',
        type: 'gallery',
        alt: 'Pool at sunset',
        file,
      } as Record<string, unknown>)[key] ?? null,
    }

    const response = await postPhoto({ formData: async () => form } as unknown as Request)
    const body = await response.clone().json().catch(() => ({}))

    expect(response.status, JSON.stringify(body)).toBe(201)
    expect(mockEnsurePartnerPlaceLink).toHaveBeenCalledWith('partner-1', 'place-1')
    expect(uploadCalls).toHaveLength(1)
    expect(fromCalls).toEqual(['partner_photo_submissions'])
    expect(insertCalls[0].payload).toMatchObject({
      partner_id: 'partner-1',
      place_id: 'place-1',
      status: 'pending',
      mime_type: 'image/png',
    })
  })
})
