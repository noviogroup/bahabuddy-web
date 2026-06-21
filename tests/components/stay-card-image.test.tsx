import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import StayCardImage from '@/components/stays/StayCardImage'

describe('StayCardImage', () => {
  test('renders provider imagery as the primary stay image', () => {
    render(
      <StayCardImage
        src="https://images.example/hotel.jpg"
        alt="Goldwynn Resort"
        island="Nassau"
        propertyType="Resort"
      />,
    )

    expect(screen.getByAltText('Goldwynn Resort')).toHaveAttribute('src', 'https://images.example/hotel.jpg')
    expect(screen.queryByText('Image pending')).not.toBeInTheDocument()
  })

  test('shows branded pending state when a provider image fails', () => {
    render(
      <StayCardImage
        src="https://images.example/broken.jpg"
        alt="Harbour Island Villa"
        island="Harbour Island"
        propertyType="Villa"
      />,
    )

    fireEvent.error(screen.getByAltText('Harbour Island Villa'))

    expect(screen.getByText('Image pending')).toBeInTheDocument()
    expect(screen.getByText('Villa in Harbour Island')).toBeInTheDocument()
    expect(screen.queryByAltText('Harbour Island Villa')).not.toBeInTheDocument()
  })

  test('does not pretend fallback imagery is the property photo when no URL exists', () => {
    render(
      <StayCardImage
        src={null}
        alt="Unphotographed Stay"
        island="Exuma"
        propertyType="Home"
      />,
    )

    expect(screen.getByText('Image pending')).toBeInTheDocument()
    expect(screen.getByText('Home in Exuma')).toBeInTheDocument()
    expect(screen.queryByAltText('Unphotographed Stay')).not.toBeInTheDocument()
  })
})
