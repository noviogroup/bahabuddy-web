import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'

describe('StoreBadgeLinks', () => {
  test('renders nothing until a real store listing is configured', () => {
    const { container } = render(<StoreBadgeLinks appStoreUrl={null} googlePlayUrl={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('renders only the configured store badges', () => {
    render(<StoreBadgeLinks appStoreUrl="https://apps.apple.com/app/baha-buddy/id123456789" googlePlayUrl={null} />)
    expect(screen.getByRole('link', { name: 'Download on the App Store' })).toHaveAttribute('href', 'https://apps.apple.com/app/baha-buddy/id123456789')
    expect(screen.queryByRole('link', { name: 'Get it on Google Play' })).toBeNull()
  })
})
