import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import BuildMyCruiseDayPage from '@/app/build-my-cruise-day/page'
import NassauCruiseDayPlannerPage from '@/app/nassau-cruise-day-planner/page'
import NassauCruiseItinerariesPage from '@/app/nassau-cruise-itineraries/page'
import NassauCruiseItineraryDetailPage from '@/app/nassau-cruise-itineraries/[slug]/page'

type QueryResult = {
  data: unknown
  error: null
}

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/ChatWidget', () => ({
  default: () => null,
}))

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    notFound: vi.fn(() => {
      throw new Error('notFound')
    }),
  }
})

const PLAN = {
  id: 'plan-1',
  slug: 'nassau-family-day',
  area: 'Downtown Nassau',
  title: 'Nassau family day',
  short_description: 'A cruise-safe family route with food, beach time, and shopping.',
  full_description: 'A cruise-safe family route with food, beach time, shopping, and a conservative ship-return buffer.',
  duration_min_minutes: 240,
  duration_max_minutes: 360,
  mobility_level: 'Easy walking',
  budget_level: 'Moderate',
  base_price: 9.99,
  personalized_price: 19.99,
  concierge_price: 49.99,
  stops: [
    {
      id: 'stop-1',
      stop_order: 1,
      name: 'Queen\'s Staircase',
      description: 'Start with a compact cultural stop close to port.',
      suggested_arrival_offset_minutes: 30,
      suggested_duration_minutes: 35,
      baha_tip: 'Go early before tour groups stack up.',
    },
  ],
}

class MockSupabaseQuery {
  constructor(private readonly result: QueryResult) {}

  select = vi.fn(() => this)
  order = vi.fn(() => this)
  eq = vi.fn(() => this)
  maybeSingle = vi.fn(() => Promise.resolve({
    data: Array.isArray(this.result.data) ? this.result.data[0] : this.result.data,
    error: this.result.error,
  }))

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

function setupSupabase() {
  supabaseMocks.createClient.mockResolvedValue({
    from: (table: string) => new MockSupabaseQuery({
      data: table === 'published_cruise_itineraries' ? [PLAN] : PLAN,
      error: null,
    }),
  })
}

function expectNoDecorativeInnerPageChrome(container: HTMLElement) {
  expect(container.innerHTML).not.toMatch(/DefaultHeaderHero|bg-gradient-brand|min-h-\[|py-20|py-24/)
  expect(container.innerHTML).not.toMatch(/border-sand|bg-sand|ring-sand|bg-offwhite|shadow-card/)
  expect(container.innerHTML).not.toMatch(/border-gold|ring-gold/)
}

describe('guided tours public routes neutral layout', () => {
  beforeEach(() => {
    setupSupabase()
  })

  test('guided-tour listing uses compact header and neutral itinerary cards', async () => {
    const page = await NassauCruiseItinerariesPage()
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Choose a smarter way to spend one day in Nassau.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View planner' })).toHaveAttribute('href', '/nassau-cruise-day-planner')
    expect(screen.getByRole('link', { name: 'Build custom day' })).toHaveAttribute('href', '/build-my-cruise-day')
    expect(screen.getByRole('link', { name: 'View itinerary' })).toHaveAttribute(
      'href',
      '/nassau-cruise-itineraries/nassau-family-day',
    )
    expect(screen.getByText('Cruise-safe return buffer')).toBeInTheDocument()
    expect(screen.getByText('Nassau family day').closest('article')).toHaveClass('border-gray-200')
    expectNoDecorativeInnerPageChrome(container)
  })

  test('guided-tour detail uses compact header and neutral timeline/safety cards', async () => {
    const page = await NassauCruiseItineraryDetailPage({
      params: Promise.resolve({ slug: 'nassau-family-day' }),
    })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Nassau family day' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Personalize this plan' })).toHaveAttribute(
      'href',
      '/build-my-cruise-day?itinerary=nassau-family-day',
    )
    expect(screen.getByRole('link', { name: 'View stops' })).toHaveAttribute('href', '#timeline')
    expect(screen.getByRole('heading', { name: 'Know when to head back.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Follow the day stop by stop.' })).toBeInTheDocument()
    expect(screen.getByText('Queen\'s Staircase')).toBeInTheDocument()
    expectNoDecorativeInnerPageChrome(container)
  })

  test('cruise planner and intake pages use compact marketplace layout', async () => {
    const planner = render(<NassauCruiseDayPlannerPage />)

    expect(screen.getByRole('heading', { name: 'Your cruise stop is short. Your Nassau experience should not feel random.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View itineraries' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Build my cruise day' })).toHaveClass('border-gray-300')
    expectNoDecorativeInnerPageChrome(planner.container)

    planner.unmount()

    const intakePage = await BuildMyCruiseDayPage({
      searchParams: Promise.resolve({ itinerary: 'nassau-family-day' }),
    })
    const intake = render(intakePage)

    expect(screen.getByRole('heading', { name: 'Build your Nassau cruise day around your real ship time.' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeRequired()
    expect(intake.container.querySelector('form[name="baha-buddy-cruise-day-intake"]')).toHaveClass('border-gray-200')
    expectNoDecorativeInnerPageChrome(intake.container)
  })
})
