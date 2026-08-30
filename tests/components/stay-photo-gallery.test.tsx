import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import StayPhotoGallery from '@/components/stays/StayPhotoGallery'

const photos = [
  'https://static.cupid.travel/hotels/rosewood-1.jpg',
  'https://static.cupid.travel/hotels/rosewood-2.jpg',
  'https://static.cupid.travel/hotels/rosewood-3.jpg',
  'https://static.cupid.travel/hotels/rosewood-4.jpg',
  'https://static.cupid.travel/hotels/rosewood-5.jpg',
  'https://static.cupid.travel/hotels/rosewood-6.jpg',
]

describe('StayPhotoGallery', () => {
  test('opens visible stay photos in a lightbox gallery', () => {
    render(
      <StayPhotoGallery
        hotelName="Rosewood Baha Mar"
        galleryUrls={photos}
        heroUrl={photos[0]}
        photoCountLabel="6 hotel photos"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Rosewood Baha Mar photo 1' }))

    expect(screen.getByRole('dialog', { name: 'Rosewood Baha Mar photo gallery' })).toBeInTheDocument()
    expect(screen.getByText('Photo 1 of 6')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Photo 2 of 6')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog', { name: 'Rosewood Baha Mar photo gallery' })).not.toBeInTheDocument()
  })

  test('uses the view-all control to open the same lightbox', () => {
    render(
      <StayPhotoGallery
        hotelName="Rosewood Baha Mar"
        galleryUrls={photos}
        heroUrl={photos[0]}
        photoCountLabel="6 hotel photos"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View all photos' }))

    expect(screen.getByRole('dialog', { name: 'Rosewood Baha Mar photo gallery' })).toBeInTheDocument()
    expect(screen.getByText('Photo 1 of 6')).toBeInTheDocument()
  })
})
