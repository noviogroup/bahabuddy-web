import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import TourCover from '@/components/guided-day/TourCover'
import SelfGuidedToursSection from '@/components/home/SelfGuidedToursSection'
import { tourDurationLabel } from '@/lib/guided-day/display'

describe('tour artwork', () => {
  test.each([undefined, '', ' ', 'javascript:alert(1)', '//untrusted.test/image.png'])('missing or invalid cover stays explicit: %s', (src) => {
    render(<TourCover src={src} title="Nassau" />)
    expect(screen.getByText('Route photo pending')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('failed illustrations use the placeholder and a new image can recover', () => {
    const { rerender } = render(<TourCover src="https://example.test/nassau-ai-illustration.png" title="Nassau" />)
    expect(screen.getByText('AI illustration')).toBeInTheDocument()
    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByText('Route photo pending')).toBeInTheDocument()
    expect(screen.queryByText('AI illustration')).not.toBeInTheDocument()
    rerender(<TourCover src="https://example.test/approved-route.png" title="Nassau" />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.queryByText('Route photo pending')).not.toBeInTheDocument()
  })

  test('homepage illustration leads to the existing published catalogue', () => {
    render(<SelfGuidedToursSection />)
    expect(screen.getByRole('link', { name: 'Explore self-guided tours' })).toHaveAttribute('href', '/nassau-cruise-itineraries')
    expect(screen.getByRole('img')).toHaveAccessibleName(/Destination illustration/)
    expect(screen.getByText('AI illustration')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/source gate|approved (tours|routes)|verified coordinates/i)
  })

  test.each([[30, 45, '30m–45m'], [90, 90, '1h 30m'], [90, 120, '1h 30m–2h'], [0, 0, 'Duration not listed'], [120, 30, 'Duration not listed']])('duration preserves short routes (%s, %s)', (min, max, expected) => {
    expect(tourDurationLabel(min as number, max as number)).toBe(expected)
  })
})
