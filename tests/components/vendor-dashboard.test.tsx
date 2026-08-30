import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { VendorOverview } from '@/components/vendor/VendorDashboard'
import { VendorAccessPending } from '@/components/vendor/VendorPortalShell'
import type { VendorDashboardData } from '@/lib/vendor-portal'

const baseData: VendorDashboardData = {
  membership: {
    id: 'membership-1',
    partner_id: 'partner-1',
    auth_user_id: 'user-1',
    email: 'vendor@example.com',
    role: 'owner',
    status: 'active',
    created_at: '2026-07-05T12:00:00.000Z',
    updated_at: '2026-07-05T12:00:00.000Z',
    partner: null,
  },
  memberships: [],
  listings: [],
  performance: {
    partnerId: 'partner-1',
    linkedPlaces: 0,
    totalLeads: 0,
    convertedLeads: 0,
    campaigns: 0,
    campaignRevenue: 0,
    paidPayouts: 0,
    pendingProfileSubmissions: 0,
    pendingDealSubmissions: 0,
    pendingPhotoSubmissions: 0,
  },
  pendingSubmissions: [],
}

describe('vendor portal UI states', () => {
  test('renders an empty active dashboard state', () => {
    render(<VendorOverview data={baseData} />)
    expect(screen.getAllByText('Linked listings').length).toBeGreaterThan(0)
    expect(screen.getByText('No linked listings yet.')).toBeInTheDocument()
    expect(screen.getByText('No pending submissions.')).toBeInTheDocument()
  })

  test('renders pending submission rows', () => {
    render(
      <VendorOverview
        data={{
          ...baseData,
          performance: { ...baseData.performance, pendingProfileSubmissions: 1 },
          pendingSubmissions: [{
            id: 'submission-1',
            type: 'profile',
            title: 'Profile update request',
            detail: 'Business profile changes',
            status: 'pending',
            createdAt: '2026-07-05T12:00:00.000Z',
          }],
        }}
      />,
    )
    expect(screen.getByText('Profile update request')).toBeInTheDocument()
    expect(screen.getByText('Business profile changes')).toBeInTheDocument()
  })

  test('renders access pending for authenticated users without active access', () => {
    render(
      <VendorAccessPending
        state={{
          kind: 'ready',
          user: { id: 'user-1', email: 'vendor@example.com' } as any,
          memberships: [],
          activeMemberships: [],
          disabledMemberships: [],
          pendingInvites: [],
        }}
      />,
    )
    expect(screen.getByText('Access pending')).toBeInTheDocument()
    expect(screen.getByText('vendor@example.com')).toBeInTheDocument()
  })
})
