import Link from 'next/link'
import type { VendorDashboardData, VendorListing, VendorPerformance } from '@/lib/vendor-portal'
import { StatusPill } from './VendorPortalShell'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not updated'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Not updated'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function MetricCard({ label, value, detail, tone = 'brand' }: { label: string; value: string | number; detail: string; tone?: 'brand' | 'gold' | 'palm' | 'cyan' }) {
  const toneClass = {
    brand: 'bg-brand-50 text-brand-700',
    gold: 'bg-gold-50 text-gold-700',
    palm: 'bg-palm-50 text-palm-700',
    cyan: 'bg-cyan-50 text-cyan-700',
  }[tone]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-soft">
      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-full ${toneClass}`} aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-current" />
      </div>
      <div className="text-3xl font-bold leading-none text-night">{value}</div>
      <div className="mt-2 text-sm font-semibold leading-5 text-night">{label}</div>
      <div className="mt-4 text-xs font-semibold leading-5 text-brand-700">{detail}</div>
    </div>
  )
}

export function VendorMetrics({ performance, listingsCount }: { performance: VendorPerformance; listingsCount: number }) {
  const pending = performance.pendingProfileSubmissions + performance.pendingDealSubmissions + performance.pendingPhotoSubmissions
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Linked listings" value={listingsCount} detail="View all" tone="brand" />
      <MetricCard label="Pending submissions" value={pending} detail="Pending admin review" tone="gold" />
      <MetricCard label="New leads (30 days)" value={performance.totalLeads} detail="View leads" tone="cyan" />
      <MetricCard label="Campaign revenue" value={formatCurrency(performance.campaignRevenue)} detail="View campaigns" tone="brand" />
      <MetricCard label="Paid payouts" value={formatCurrency(performance.paidPayouts)} detail="View payouts" tone="gold" />
    </div>
  )
}

export function VendorLinkedListingsTable({ listings, compact = false }: { listings: VendorListing[]; compact?: boolean }) {
  const rows = compact ? listings.slice(0, 5) : listings

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-bold leading-6 text-night">Linked listings</h2>
        {compact ? (
          <Link href="/vendor/listings" className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold leading-5 text-brand-700 hover:bg-brand-50">
            View all listings
          </Link>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((listing) => (
              <tr key={listing.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold leading-6 text-night">{listing.place?.name || listing.place_id}</td>
                <td className="px-4 py-3 capitalize leading-6 text-charcoal">{listing.place?.category?.replace(/_/g, ' ') || listing.relationship_type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 leading-6 text-charcoal">{listing.place?.island_name || 'Bahamas'}</td>
                <td className="px-4 py-3">
                  <StatusPill status={listing.place?.is_active ? 'live' : 'pending'} tone={listing.place?.is_active ? 'success' : 'warning'} />
                </td>
                <td className="px-4 py-3 leading-6 text-charcoal">{formatDate(listing.place?.updated_at || listing.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm font-semibold text-gray-500">
                  No linked listings yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {compact && listings.length > 0 ? (
        <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          Showing 1 to {rows.length} of {listings.length} listings
        </div>
      ) : null}
    </div>
  )
}

export function PendingReviewList({ items }: { items: VendorDashboardData['pendingSubmissions'] }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-bold leading-6 text-night">Pending admin review</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-4 px-4 py-4">
            <div className="min-w-0">
              <div className="font-bold leading-6 text-night">{item.title}</div>
              <div className="mt-1 truncate text-sm text-charcoal">{item.detail}</div>
            </div>
            <div className="shrink-0 text-right">
              <StatusPill status={item.status} tone="warning" />
              <div className="mt-1 text-xs font-semibold text-gray-500">{formatDate(item.createdAt)}</div>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm font-semibold text-gray-500">
            No pending submissions.
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function QuickActions() {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-soft">
      <h2 className="text-base font-bold leading-6 text-night">Quick actions</h2>
      <div className="mt-4 grid gap-3">
        <Link href="/vendor/profile" className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-bold leading-5 text-white hover:bg-brand-700">
          Submit profile update
        </Link>
        <Link href="/vendor/media" className="inline-flex min-h-11 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold leading-5 text-night hover:bg-gray-50">
          Upload photos
        </Link>
        <Link href="/vendor/deals" className="inline-flex min-h-11 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold leading-5 text-night hover:bg-gray-50">
          Propose deal
        </Link>
      </div>
    </div>
  )
}

export function VendorOverview({ data }: { data: VendorDashboardData }) {
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-6">
        <VendorMetrics performance={data.performance} listingsCount={data.listings.length} />
        <VendorLinkedListingsTable listings={data.listings} compact />
      </div>
      <div className="min-w-0 space-y-6">
        <QuickActions />
        <PendingReviewList items={data.pendingSubmissions} />
      </div>
    </div>
  )
}

export function VendorPerformanceView({ performance }: { performance: VendorPerformance }) {
  const values = [
    ['Linked listings', performance.linkedPlaces],
    ['Total leads', performance.totalLeads],
    ['Converted leads', performance.convertedLeads],
    ['Campaigns', performance.campaigns],
    ['Campaign revenue', formatCurrency(performance.campaignRevenue)],
    ['Paid payouts', formatCurrency(performance.paidPayouts)],
    ['Pending profile updates', performance.pendingProfileSubmissions],
    ['Pending deals', performance.pendingDealSubmissions],
    ['Pending photos', performance.pendingPhotoSubmissions],
  ]

  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-soft">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-bold leading-6 text-night">Performance summary</h2>
      </div>
      <div className="grid gap-px bg-gray-100 sm:grid-cols-2 lg:grid-cols-3">
        {values.map(([label, value]) => (
          <div key={label} className="bg-white p-5">
            <div className="text-sm font-semibold leading-5 text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-bold leading-8 text-night">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
