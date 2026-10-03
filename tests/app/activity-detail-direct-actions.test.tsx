import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ActivityDetailPage from '@/app/(dashboard)/activities/[id]/page'
import PublicActivityDetailPage from '@/app/explore/activities/[id]/page'
import { canonicalPlaceRow, createRecordingSupabase, selfTourRow } from '../fixtures/recording-supabase'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('not found')
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: supabaseMocks.redirect,
  notFound: supabaseMocks.notFound,
}))

const componentMocks = vi.hoisted(() => ({
  directTripItemActions: vi.fn(),
}))

// Public catalog reads use the cookie-free client; route them to the same
// mock client the test configures for the cookie client.
vi.mock('@/lib/supabase/public', async () => {
  const { deferredSupabaseClient } = await import('../fixtures/deferred-supabase')
  return { createPublicClient: () => deferredSupabaseClient(() => supabaseMocks.createClient()) }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/ChatWidget', () => ({
  default: () => null,
}))

vi.mock('@/components/TrackView', () => ({
  default: () => null,
}))

vi.mock('@/components/trip/DirectTripItemActions', () => ({
  default: (props: Record<string, unknown>) => {
    componentMocks.directTripItemActions(props)
    return (
      <section data-testid="direct-trip-actions">
        <h2>{String(props.heading)}</h2>
        <a href={String(props.returnPath)}>{String(props.primaryLabel)}</a>
      </section>
    )
  },
}))

vi.mock('@/components/marketplace/ImageWithSourcePolicy', () => ({
  default: (props: {
    src?: string | null
    alt: string
    title: string
    className?: string
    children?: ReactNode
  }) => (
    <figure
      data-testid="activity-image"
      data-src={props.src ?? ''}
      data-alt={props.alt}
      className={props.className}
    >
      <figcaption>{props.title}</figcaption>
      {props.children}
    </figure>
  ),
}))

const activityId = '24600000-0000-4000-8000-000000000001'

function approvedRow(overrides: Record<string, unknown> = {}) {
  return {
    activity_id: activityId,
    place_id: null,
    source_layer: 'places',
    source_record_id: 'source-exuma-cays-tour',
    name: 'Exuma Cays Boat Tour',
    island_slug: 'the-exumas',
    category_tags: ['adventure', 'beach'],
    description: 'A guided boat day across the Exuma cays.',
    location_model: 'meeting_point',
    latitude: 23.5,
    longitude: -75.7,
    location_notes: 'Great Exuma dock',
    contact: {},
    seasonality: {},
    safety_access: { label: 'Life jacket required' },
    price_basis: { amount: 250, currency: 'USD', basis: 'per_group', is_from: true },
    booking_quote_state: 'request_quote',
    cancellation: { label: '48-hour cancellation' },
    media: { hero_url: 'https://images.example/exuma-tour.jpg' },
    duration: { label: 'Full day' },
    meeting_pickup: { label: 'Great Exuma dock' },
    group_age_limits: { label: 'Max 8 guests' },
    source_checked_at: '2026-09-26T00:00:00Z',
    source_recheck_at: '2026-10-26T00:00:00Z',
    source_owner: 'Operator',
    source_class: 'responsible_operator',
    source_url: 'https://example.invalid/tour',
    live_availability_state: 'requires_live_check',
    ...overrides,
  }
}

const INTERNAL_COPY = /approved source|source-approved|source gate|projection/i

describe('ActivityDetailPage direct actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns to Explore activities and exposes direct add-to-trip before Buddy planning', async () => {
    const row = approvedRow()

    supabaseMocks.createClient.mockResolvedValue({
      rpc: vi.fn(async () => ({ data: [row], error: null })),
    })

    const page = await ActivityDetailPage({ params: { id: activityId } })
    const { container } = render(page)

    expect(screen.getByText('Experience detail')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Exuma Cays Boat Tour' })).toBeInTheDocument()
    expect(screen.getByText('External quote')).toBeInTheDocument()
    expect(screen.getByText('Great Exuma dock')).toBeInTheDocument()

    const backHref = screen.getByRole('link', { name: 'Browse more activities' }).getAttribute('href') ?? ''
    const backUrl = new URL(backHref, 'https://bahabuddy.test')
    expect(backUrl.pathname).toBe('/explore/places')
    expect(backUrl.searchParams.get('category')).toBe('Activity')
    expect(backUrl.searchParams.get('island')).toBe('the-exumas')
    expect(screen.queryByRole('link', { name: 'Back to chat' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Back to activities' })).not.toBeInTheDocument()

    const activityImage = screen.getByTestId('activity-image')
    expect(activityImage).toHaveAttribute('data-src', 'https://images.example/exuma-tour.jpg')
    expect(activityImage).toHaveAttribute('data-alt', 'Exuma Cays Boat Tour')

    expect(screen.getByTestId('direct-trip-actions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add experience to trip' })).toHaveAttribute(
      'href',
      `/activities/${activityId}#trip-actions`,
    )
    expect(componentMocks.directTripItemActions).toHaveBeenCalledWith(expect.objectContaining({
      itemType: 'activity',
      sourceId: activityId,
      sourceType: 'approved_activity',
      name: 'Exuma Cays Boat Tour',
      island: 'The Exumas',
      imageUrl: 'https://images.example/exuma-tour.jpg',
      returnPath: `/activities/${activityId}#trip-actions`,
      heading: 'Save this experience',
      primaryLabel: 'Add experience to trip',
      createTripLabel: 'Create trip for this experience',
      savedLabel: 'Saved experience to trip',
      timeSlot: 'afternoon',
      metadata: expect.objectContaining({
        activityId,
        islandSlug: 'the-exumas',
        sourceRecordId: 'source-exuma-cays-tour',
        sourceLayer: 'places',
        bookingQuoteState: 'request_quote',
      }),
    }))

    // Travelers see the island name, never the catalog slug.
    expect(screen.getByTestId('activity-image')).toHaveTextContent('The Exumas')
    expect(container).not.toHaveTextContent('the-exumas')
    expect(container).not.toHaveTextContent(INTERNAL_COPY)

    const sourceLink = screen.getByRole('link', { name: 'View source (opens in new tab)' })
    expect(sourceLink).toHaveAttribute('href', 'https://example.invalid/tour')
    expect(sourceLink).toHaveAttribute('target', '_blank')

    expect(container.innerHTML).not.toContain('bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-500')
    expect(container.innerHTML).not.toContain('aspect-[16/9] sm:aspect-[2/1]')
    expect(container.innerHTML).not.toContain('DefaultHeaderHero')
  })

  test('sends a canonical attraction id to its catalog place page instead of inventing offer facts', async () => {
    const row = canonicalPlaceRow()
    const { client } = createRecordingSupabase({
      rpc: () => ({ data: [selfTourRow()], error: null }),
      tables: () => ({ data: [row], error: null }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)

    await expect(ActivityDetailPage({ params: { id: row.id } })).rejects.toThrow(
      'redirect:/explore/places/fort-fincastle',
    )
    expect(supabaseMocks.notFound).not.toHaveBeenCalled()
  })

  test('says a missing fact is not listed and hides an absent source link', async () => {
    supabaseMocks.createClient.mockResolvedValue({
      rpc: vi.fn(async () => ({
        data: [approvedRow({ duration: null, group_age_limits: null, source_url: '' })],
        error: null,
      })),
    })

    const { container } = render(await ActivityDetailPage({ params: { id: activityId } }))

    expect(screen.getAllByText('Not listed').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /View source/ })).not.toBeInTheDocument()
    expect(container).not.toHaveTextContent(INTERNAL_COPY)
  })

  test('serves the same detail publicly, with trip actions returning to the public route', async () => {
    const rpc = vi.fn(async () => ({ data: [approvedRow()], error: null }))
    supabaseMocks.createClient.mockResolvedValue({ rpc })

    render(await PublicActivityDetailPage({ params: { id: activityId } }))

    expect(rpc).toHaveBeenCalledWith('get_approved_activity_recommendations', expect.objectContaining({
      p_activity_id: activityId,
    }))
    expect(screen.getByRole('heading', { name: 'Exuma Cays Boat Tour' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add experience to trip' })).toHaveAttribute(
      'href',
      `/explore/activities/${activityId}#trip-actions`,
    )
    expect(screen.getByText('Marketplace footer')).toBeInTheDocument()
    expect(supabaseMocks.redirect).not.toHaveBeenCalled()
  })

  test('public route also sends canonical attraction ids to their catalog place page', async () => {
    const row = canonicalPlaceRow()
    const { client } = createRecordingSupabase({
      rpc: () => ({ data: [], error: null }),
      tables: () => ({ data: [row], error: null }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)

    await expect(PublicActivityDetailPage({ params: { id: row.id } })).rejects.toThrow(
      'redirect:/explore/places/fort-fincastle',
    )
  })

  test('returns not found for an unknown activity id', async () => {
    const { client } = createRecordingSupabase({
      rpc: () => ({ data: [], error: null }),
      tables: () => ({ data: [], error: null }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)

    await expect(ActivityDetailPage({ params: { id: '24600000-0000-4000-8000-00000000ffff' } })).rejects.toThrow('not found')
    expect(supabaseMocks.redirect).not.toHaveBeenCalled()
  })
})
