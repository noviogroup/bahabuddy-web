import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import StayCardImage from '@/components/stays/StayCardImage'

describe('StayCardImage', () => {
  test('renders provider imagery as the primary stay image', () => {
    render(
      <StayCardImage
        src="https://images.example/hotel.jpg"
        photos={['https://images.example/hotel-pool.jpg']}
        alt="Goldwynn Resort"
        island="Nassau"
        propertyType="Resort"
      />,
    )

    expect(screen.getByAltText('Goldwynn Resort')).toHaveAttribute('src', 'https://images.example/hotel.jpg')
    const nextPhoto = screen.getByRole('button', { name: 'Next photo of Goldwynn Resort' })
    expect(nextPhoto).toBeInTheDocument()
    expect(nextPhoto).toHaveClass('bg-white')
    expect(nextPhoto).not.toHaveClass('bg-white/92')
    expect(screen.queryByText('Image pending')).not.toBeInTheDocument()
  })

  test('cycles through stay photos from the list card controls', () => {
    render(
      <StayCardImage
        src="https://images.example/hotel.jpg"
        photos={[
          'https://images.example/hotel.jpg',
          'https://images.example/hotel-pool.jpg',
          'https://images.example/hotel-room.jpg',
        ]}
        alt="Goldwynn Resort"
        island="Nassau"
        propertyType="Resort"
      />,
    )

    expect(screen.getByAltText('Goldwynn Resort')).toHaveAttribute('src', 'https://images.example/hotel.jpg')
    expect(screen.getByText('1/3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next photo of Goldwynn Resort' }))

    expect(screen.getByAltText('Goldwynn Resort')).toHaveAttribute('src', 'https://images.example/hotel-pool.jpg')
    expect(screen.getByText('2/3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Previous photo of Goldwynn Resort' }))

    expect(screen.getByAltText('Goldwynn Resort')).toHaveAttribute('src', 'https://images.example/hotel.jpg')
    expect(screen.getByText('1/3')).toBeInTheDocument()
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

    expect(screen.queryByText('Image pending')).not.toBeInTheDocument()
    expect(screen.getByText('Villa in Harbour Island')).toBeInTheDocument()
    expect(screen.getByText('Baha Buddy stay')).toBeInTheDocument()
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

    expect(screen.queryByText('Image pending')).not.toBeInTheDocument()
    expect(screen.getByText('Home in Exuma')).toBeInTheDocument()
    expect(screen.getByText('Baha Buddy stay')).toBeInTheDocument()
    expect(screen.queryByAltText('Unphotographed Stay')).not.toBeInTheDocument()
  })
})
