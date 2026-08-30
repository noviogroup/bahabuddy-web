import Link from 'next/link'
import type { VendorMembership, VendorPortalState } from '@/lib/vendor-portal'
import { VendorPartnerSwitcher, VendorSidebar } from './VendorNav'

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function StatusPill({ status, tone = 'neutral' }: { status: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' }) {
  const toneClass = {
    neutral: 'bg-gray-100 text-gray-700',
    success: 'bg-palm-50 text-palm-700 ring-1 ring-palm-100',
    warning: 'bg-gold-50 text-gold-700 ring-1 ring-gold-100',
    danger: 'bg-red-50 text-red-700 ring-1 ring-red-100',
    brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100',
  }[tone]

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize leading-5', toneClass)}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function VendorAccessPending({ state }: { state: Extract<VendorPortalState, { kind: 'ready' }> }) {
  return (
    <main className="min-h-screen bg-offwhite px-4 py-10 font-sans text-night">
      <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-card">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gold-50 text-gold-700" aria-hidden>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 3" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold leading-8">Access pending</h1>
        <p className="mt-2 text-sm leading-6 text-charcoal">
          Your Baha Buddy account is signed in, but it does not have active vendor portal access yet.
        </p>

        <div className="mt-6 rounded-lg border border-gray-200 bg-offwhite p-4">
          <div className="text-sm font-bold leading-5 text-night">Portal status</div>
          <div className="mt-3 space-y-2 text-sm text-charcoal">
            <div>Email: <span className="font-bold text-night">{state.user.email}</span></div>
            <div>Active memberships: <span className="font-bold text-night">{state.activeMemberships.length}</span></div>
            <div>Pending invitations: <span className="font-bold text-night">{state.pendingInvites.length}</span></div>
          </div>
        </div>

        {state.pendingInvites.length > 0 ? (
          <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50 p-4">
            <div className="text-sm font-bold leading-5 text-brand-900">Admin invitation found</div>
            <p className="mt-1 text-sm leading-6 text-brand-900">
              An admin-created invitation exists for this email. Admin must activate the membership before portal tools unlock.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/partners" className="inline-flex min-h-10 items-center rounded-full bg-brand-600 px-4 text-sm font-bold leading-5 text-white hover:bg-brand-700">
            Partner information
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-10 items-center rounded-full border border-gray-200 bg-white px-4 text-sm font-bold leading-5 text-night hover:bg-gray-50">
            Traveler dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}

export function VendorServiceUnavailable() {
  return (
    <main className="min-h-screen bg-offwhite px-4 py-10 font-sans text-night">
      <div className="mx-auto max-w-2xl rounded-lg border border-red-100 bg-white p-6 shadow-card">
        <h1 className="text-2xl font-bold leading-8">Vendor portal unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-charcoal">
          Vendor access is not ready yet. Contact Baha Buddy support for help.
        </p>
      </div>
    </main>
  )
}

export function VendorPortalShell({
  membership,
  memberships,
  children,
}: {
  membership: VendorMembership
  memberships: VendorMembership[]
  children: React.ReactNode
}) {
  const partner = membership.partner

  return (
    <div className="min-h-screen bg-offwhite font-sans text-night md:flex">
      <VendorSidebar membership={membership} />
      <div className="min-w-0 flex-1">
        <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <VendorPartnerSwitcher memberships={memberships} />
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-charcoal">
                Partner ID: <span className="font-semibold text-night">{partner?.id?.slice(0, 8) || membership.partner_id.slice(0, 8)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-sm font-semibold text-charcoal sm:block">{partner?.name || 'Vendor portal'}</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {partner?.name?.slice(0, 2).toUpperCase() || 'VP'}
              </div>
            </div>
          </div>
        </header>

        <section className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-tight text-night">{partner?.name || 'Vendor Portal'}</h1>
              <p className="mt-1 text-base font-medium text-gray-500">{partner?.island_name || 'Bahamas'}{partner?.partner_type ? ` · ${partner.partner_type.replace(/_/g, ' ')}` : ''}</p>
            </div>
            <div className="rounded-lg border border-palm-200 bg-palm-50 px-4 py-3 text-palm-900">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-palm-500 text-white" aria-hidden>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm font-bold leading-5">Access active</div>
                  <div className="text-xs font-semibold">You have full access to the vendor portal.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
