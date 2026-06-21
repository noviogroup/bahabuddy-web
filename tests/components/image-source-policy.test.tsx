import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'

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

  test('shows image pending when the image source is missing', () => {
    render(
      <ImageWithSourcePolicy
        src={null}
        alt="Missing place photo"
        title="Island stop"
        eyebrow="Food and culture"
        description="Real item data is available. Photo is not available yet."
      />,
    )

    expect(screen.getByText('Image pending')).toBeInTheDocument()
    expect(screen.getByText('Island stop')).toBeInTheDocument()
    expect(screen.queryByAltText('Missing place photo')).not.toBeInTheDocument()
  })

  test('falls back to image pending after an image load failure', () => {
    render(
      <ImageWithSourcePolicy
        src="https://images.example/broken.jpg"
        alt="Broken provider photo"
        title="Broken image item"
        eyebrow="Stay"
      />,
    )

    fireEvent.error(screen.getByAltText('Broken provider photo'))

    expect(screen.getByText('Image pending')).toBeInTheDocument()
    expect(screen.getByText('Broken image item')).toBeInTheDocument()
    expect(screen.queryByAltText('Broken provider photo')).not.toBeInTheDocument()
  })
})
