import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import ImageWithSourcePolicy, {
  OPTIMIZABLE_IMAGE_HOSTS,
  shouldOptimizeImageSrc,
} from '@/components/marketplace/ImageWithSourcePolicy'

describe('ImageWithSourcePolicy', () => {
  test('renders the provider image when a valid item image exists', () => {
    render(
      <ImageWithSourcePolicy
        src="https://images.example/real-place.jpg"
        alt="Real place photo"
        title="Compass Point"
        eyebrow="Bahamas dining"
      />,
    )

    expect(screen.getByAltText('Real place photo')).toHaveAttribute('src', 'https://images.example/real-place.jpg')
    expect(screen.queryByText('Image pending')).not.toBeInTheDocument()
  })

  test('shows branded fallback context when the image source is missing', () => {
    render(
      <ImageWithSourcePolicy
        src={null}
        alt="Missing place photo"
        title="Island stop"
        eyebrow="Food and culture"
      />,
    )

    expect(screen.queryByText('Image pending')).not.toBeInTheDocument()
    expect(screen.getByText('Island stop')).toBeInTheDocument()
    expect(screen.getByText('Food and culture')).toBeInTheDocument()
    expect(screen.queryByAltText('Missing place photo')).not.toBeInTheDocument()
  })

  test('falls back to branded context after an image load failure', () => {
    render(
      <ImageWithSourcePolicy
        src="https://images.example/broken.jpg"
        alt="Broken provider photo"
        title="Broken image item"
        eyebrow="Stay"
      />,
    )

    fireEvent.error(screen.getByAltText('Broken provider photo'))

    expect(screen.queryByText('Image pending')).not.toBeInTheDocument()
    expect(screen.getByText('Broken image item')).toBeInTheDocument()
    expect(screen.getByText('Stay')).toBeInTheDocument()
    expect(screen.queryByAltText('Broken provider photo')).not.toBeInTheDocument()
  })

  test('optimizes local assets and allowlisted hosts, but not unknown provider hosts', () => {
    expect(shouldOptimizeImageSrc('/assets/home/trip-categories/beach.jpg')).toBe(true)
    expect(shouldOptimizeImageSrc('/assets/islands/nassau-paradise-island.svg')).toBe(false)
    expect(shouldOptimizeImageSrc('/api/place-photo?ref=abc')).toBe(false)
    expect(shouldOptimizeImageSrc('https://cdn.sanity.io/images/p/d/photo.jpg')).toBe(true)
    expect(
      shouldOptimizeImageSrc('https://abc.supabase.co/storage/v1/object/public/photos/a.jpg'),
    ).toBe(true)
    expect(shouldOptimizeImageSrc('https://abc.supabase.co/rest/v1/whatever')).toBe(false)
    expect(shouldOptimizeImageSrc('https://static.cupid.travel/hotels/1.jpg')).toBe(false)
    expect(shouldOptimizeImageSrc('https://lh3.googleusercontent.com/p/abc')).toBe(false)
    expect(shouldOptimizeImageSrc('http://cdn.sanity.io/images/p/d/photo.jpg')).toBe(false)
  })

  test('routes allowlisted images through next/image optimization by default', () => {
    render(
      <ImageWithSourcePolicy
        src="/assets/home/trip-categories/beach.jpg"
        alt="Local beach"
        title="Beach"
        eyebrow="Trip"
      />,
    )

    expect(screen.getByAltText('Local beach').getAttribute('src')).toContain('/_next/image?url=')
  })

  test('every optimizable host is allowlisted in next.config.mjs remotePatterns', () => {
    const config = readFileSync(path.resolve(__dirname, '../../next.config.mjs'), 'utf8')
    for (const host of OPTIMIZABLE_IMAGE_HOSTS) {
      const pattern = host.startsWith('.') ? `'**${host}'` : `'${host}'`
      expect(config, `${host} missing from remotePatterns`).toContain(`hostname: ${pattern}`)
    }
  })
})
