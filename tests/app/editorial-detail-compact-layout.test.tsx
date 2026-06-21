import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import GuidePage from '@/app/guides/[slug]/page'
import ArticlePage from '@/app/explore/articles/[slug]/page'

const sanityMocks = vi.hoisted(() => ({
  fetchArticleBySlug: vi.fn(),
  fetchAllArticleSlugs: vi.fn(),
}))

vi.mock('@/lib/sanity/queries', () => ({
  fetchArticleBySlug: sanityMocks.fetchArticleBySlug,
  fetchAllArticleSlugs: sanityMocks.fetchAllArticleSlugs,
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
}))

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/PortableTextBody', () => ({
  default: () => <div data-testid="portable-text">Portable article body</div>,
}))

vi.mock('@/components/marketplace/ImageWithSourcePolicy', () => ({
  default: ({
    src,
    title,
    tone,
    className,
  }: {
    src?: string | null
    title: string
    tone?: string
    className?: string
  }) => (
    <div
      data-testid="image-with-source-policy"
      data-src={src ?? ''}
      data-title={title}
      data-tone={tone}
      className={className}
    />
  ),
}))

function expectNoOldArticleHero(container: HTMLElement) {
  expect(container.innerHTML).not.toMatch(/from-black\/30|from-black\/40|bg-black\/40/)
  expect(container.innerHTML).not.toContain('aspect-[16/9] rounded-2xl overflow-hidden mb-8')
  expect(container.innerHTML).not.toContain('aspect-[16/10] sm:aspect-[16/9] rounded-baha-lg overflow-hidden mb-6')
}

describe('editorial detail compact layout', () => {
  beforeEach(() => {
    sanityMocks.fetchAllArticleSlugs.mockResolvedValue([])
    sanityMocks.fetchArticleBySlug.mockReset()
  })

  test('guide detail renders title and direct actions before supporting media', async () => {
    sanityMocks.fetchArticleBySlug.mockResolvedValue({
      _id: 'guide-1',
      slug: 'nassau-food-guide',
      title: 'Nassau food guide',
      excerpt: 'Where to eat well around Nassau without wasting a meal.',
      category: 'food_dining',
      imageUrl: 'https://images.example.com/nassau-food.jpg',
      readTimeMinutes: 6,
      publishedAt: '2026-06-01',
      featured: true,
      body: [{ _type: 'block', children: [] }],
    })

    const page = await GuidePage({ params: { slug: 'nassau-food-guide' } })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Nassau food guide' })).toBeInTheDocument()
    expect(screen.getAllByText('Food & Dining').length).toBeGreaterThan(0)
    expect(screen.getByTestId('image-with-source-policy')).toHaveAttribute('data-src', 'https://images.example.com/nassau-food.jpg')
    expect(screen.getByTestId('image-with-source-policy')).toHaveClass('aspect-[16/7]')

    const startTripLinks = screen.getAllByRole('link', { name: /Start trip from guide/ })
    expect(startTripLinks[0]).toHaveClass('bg-brand-600')
    const startTripUrl = new URL(startTripLinks[0].getAttribute('href') ?? '', 'https://bahabuddy.app')
    expect(startTripUrl.pathname).toBe('/dashboard/trips/new')
    expect(startTripUrl.searchParams.get('source')).toBe('guide')
    expect(startTripUrl.searchParams.get('returnTo')).toBe('/guides/nassau-food-guide')

    expect(screen.getAllByRole('link', { name: 'Ask Buddy' })[0]).toHaveClass('border-gray-300')
    expectNoOldArticleHero(container)
  })

  test('Explore article fallback renders compact reader with direct planning action', async () => {
    sanityMocks.fetchArticleBySlug.mockResolvedValue(null)

    const page = await ArticlePage({ params: { slug: 'pink-sand-harbour-island' } })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: /Where to find pink sand/ })).toBeInTheDocument()
    expect(screen.getByTestId('image-with-source-policy')).toHaveClass('aspect-[16/7]')
    expect(screen.getByTestId('image-with-source-policy')).toHaveAttribute('data-tone', 'island')
    expect(screen.getByText('Marketplace footer')).toBeInTheDocument()

    const startTripLinks = screen.getAllByRole('link', { name: /Start trip from article/ })
    expect(startTripLinks[0]).toHaveClass('bg-brand-600')
    const startTripUrl = new URL(startTripLinks[0].getAttribute('href') ?? '', 'https://bahabuddy.app')
    expect(startTripUrl.pathname).toBe('/dashboard/trips/new')
    expect(startTripUrl.searchParams.get('source')).toBe('article')
    expect(startTripUrl.searchParams.get('returnTo')).toBe('/explore/articles/pink-sand-harbour-island')

    expect(screen.getAllByRole('link', { name: 'Ask Buddy' })[0]).toHaveClass('border-gray-300')
    expectNoOldArticleHero(container)
  })
})
