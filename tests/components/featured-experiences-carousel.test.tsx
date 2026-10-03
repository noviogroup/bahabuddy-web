import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import FeaturedExperiencesCarousel, {
  type FeaturedExperience,
} from '@/components/home/FeaturedExperiencesCarousel'

const experiences: FeaturedExperience[] = [
  {
    title: 'Swimming Pigs Experience',
    island: 'Exuma',
    category: 'Boat tour',
    href: '/guides/swimming-pigs-exuma',
    image: '/images/pigs.jpg',
  },
  {
    title: 'Nassau Snorkeling Tour',
    island: 'Nassau',
    category: 'Things to do',
    href: '/explore/places?search=snorkeling&island=Nassau',
    image: '/images/snorkeling.jpg',
  },
  {
    title: 'Family Beach Day',
    island: 'Paradise Island',
    category: 'Family',
    href: '/explore?category=family',
    image: '/images/family.jpg',
  },
]

describe('FeaturedExperiencesCarousel', () => {
  test('renders a marketplace-style experience shelf with direct cards', () => {
    const { container } = render(<FeaturedExperiencesCarousel experiences={experiences} />)

    expect(screen.getByLabelText('Featured Bahamas experiences')).toBeInTheDocument()
    expect(screen.queryByText('Featured pick')).not.toBeInTheDocument()
    expect(screen.queryByText('01 / 03')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next featured experience' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous featured experience' })).not.toBeInTheDocument()
    expect(container.innerHTML).not.toContain('transition-all')
    expect(container.innerHTML).not.toContain('duration-300')
    expect(container.innerHTML).not.toContain('translate')
    expect(container.innerHTML).not.toContain('scale(')
  })

  test('each experience card is image-led and links to details', () => {
    render(<FeaturedExperiencesCarousel experiences={experiences} />)

    expect(screen.getAllByTestId('featured-experience-card')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'View details for Swimming Pigs Experience' })).toHaveAttribute(
      'href',
      '/guides/swimming-pigs-exuma',
    )
    expect(screen.getByRole('link', { name: 'View details for Nassau Snorkeling Tour' })).toHaveAttribute(
      'href',
      '/explore/places?search=snorkeling&island=Nassau',
    )
    expect(screen.getByRole('link', { name: 'View details for Family Beach Day' })).toHaveAttribute(
      'href',
      '/explore?category=family',
    )
    expect(screen.getByText('Boat tour')).toBeInTheDocument()
    expect(screen.getAllByText('Plan with Buddy')).toHaveLength(3)
  })

  test('shows a gold Top pick badge and photo credit only when set', () => {
    render(
      <FeaturedExperiencesCarousel
        experiences={[
          ...experiences,
          {
            title: 'Pink Sand Beach',
            island: 'Harbour Island',
            category: 'Beach',
            href: '/explore/places/pink-sand-beach',
            image: 'https://media-cdn.tripadvisor.com/pink.jpg',
            badge: 'Top pick',
            attribution: 'Photo: Tripadvisor',
          },
        ]}
      />,
    )

    const badges = screen.getAllByTestId('featured-experience-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0]).toHaveTextContent('Top pick')
    expect(badges[0]).toHaveClass('bg-gold-400')
    expect(screen.getByText('Photo: Tripadvisor')).toBeInTheDocument()
  })
})
