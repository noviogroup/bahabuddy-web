import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { RichCardRenderer, type CardData } from '@/components/RichCards'

describe('RichCardRenderer direct actions', () => {
  test('hotel card uses direct add-to-trip and canonical stays detail link when trip context exists', () => {
    const onAddToTrip = vi.fn()
    const onSendMessage = vi.fn()
    const card: CardData = {
      card_type: 'hotel',
      place_id: 'goldwynn-resort',
      name: 'Goldwynn Resort',
      island: 'New Providence',
      rating: 4.7,
      price_per_night: 420,
      photo_url: 'https://images.example/goldwynn.jpg',
      primary_image_url: 'https://images.example/goldwynn-primary.jpg',
      gallery_images: ['https://images.example/goldwynn-gallery.jpg'],
      photo: 'https://images.example/generic-fallback.jpg',
    }

    render(
      <RichCardRenderer
        cardData={card}
        activeTripId="trip-123"
        onAddToTrip={onAddToTrip}
        onSendMessage={onSendMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add to trip' }))

    expect(screen.getByAltText('Photo of Goldwynn Resort')).toHaveAttribute(
      'src',
      'https://images.example/goldwynn-primary.jpg',
    )
    expect(onAddToTrip).toHaveBeenCalledWith(card, 'trip-123')
    expect(onSendMessage).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'View stay' })).toHaveAttribute('href', '/stays/goldwynn-resort')
  })

  test('hotel card does not turn save into a chat prompt when no active trip is available', () => {
    const onAddToTrip = vi.fn()
    const onSendMessage = vi.fn()

    render(
      <RichCardRenderer
        cardData={{ card_type: 'hotel', place_id: 'sls-baha-mar', name: 'SLS Baha Mar' }}
        onAddToTrip={onAddToTrip}
        onSendMessage={onSendMessage}
      />,
    )

    expect(screen.getByRole('link', { name: 'View stay' })).toHaveAttribute('href', '/stays/sls-baha-mar')
    expect(screen.queryByRole('button', { name: 'Add to trip' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /expand sls baha mar for more info/i }))

    expect(onAddToTrip).not.toHaveBeenCalled()
    expect(onSendMessage).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /view full details/i })).toHaveAttribute('href', '/stays/sls-baha-mar')
  })

  test('hotel card without provider imagery shows an honest photo pending state', () => {
    render(
      <RichCardRenderer
        cardData={{
          card_type: 'hotel',
          place_id: 'no-photo-stay',
          name: 'No Photo Stay',
          island: 'Exuma',
          rating: 4.5,
          review_count: 24,
        }}
      />,
    )

    expect(screen.getByText('Photo pending')).toBeInTheDocument()
    expect(screen.getByText('Card details are available. Provider photo is not available yet.')).toBeInTheDocument()
    expect(screen.queryByAltText('Photo of No Photo Stay')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View stay' })).toHaveAttribute('href', '/stays/no-photo-stay')
  })

  test('restaurant and activity cards expose collapsed direct detail and add actions', () => {
    const onAddToTrip = vi.fn()
    const onSendMessage = vi.fn()
    const restaurant: CardData = {
      card_type: 'restaurant',
      place_id: 'fish-fry',
      name: 'Arawak Cay Fish Fry',
      island: 'New Providence',
      cuisine: 'Bahamian',
      rating: 4.4,
      price_level: 2,
      opening_hours: ['Monday: 11:00 AM - 10:00 PM'],
    }
    const activity: CardData = {
      card_type: 'activity',
      place_id: 'exuma-cays-tour',
      name: 'Exuma Cays Boat Tour',
      island: 'Exuma',
      duration: '6 hours',
      from_price: 225,
      vibe_tags: ['adventure', 'beach'],
    }

    render(
      <div>
        <RichCardRenderer
          cardData={restaurant}
          activeTripId="trip-123"
          onAddToTrip={onAddToTrip}
          onSendMessage={onSendMessage}
        />
        <RichCardRenderer
          cardData={activity}
          activeTripId="trip-123"
          onAddToTrip={onAddToTrip}
          onSendMessage={onSendMessage}
        />
      </div>,
    )

    const addButtons = screen.getAllByRole('button', { name: 'Add to trip' })
    expect(addButtons[0]).toHaveClass('bg-brand-600')
    expect(addButtons[0]).not.toHaveClass('bg-night')
    expect(addButtons[1]).toHaveClass('bg-brand-600')
    expect(screen.getByText('Bahamian')).toHaveClass('bg-gray-100')
    fireEvent.click(addButtons[0])
    fireEvent.click(addButtons[1])

    const detailLinks = screen.getAllByRole('link', { name: 'View details' })
    expect(detailLinks[0]).toHaveAttribute('href', '/restaurants/fish-fry')
    expect(detailLinks[1]).toHaveAttribute('href', '/activities/exuma-cays-tour')
    expect(onAddToTrip).toHaveBeenNthCalledWith(1, restaurant, 'trip-123')
    expect(onAddToTrip).toHaveBeenNthCalledWith(2, activity, 'trip-123')
    expect(onSendMessage).not.toHaveBeenCalled()
  })

  test('destination card uses primary imagery and exposes a visible island action', () => {
    const { container } = render(
      <RichCardRenderer
        cardData={{
          card_type: 'destination',
          name: 'The Exumas',
          island_id: 'the-exumas',
          tagline: 'Sandbars, cays, and quiet water',
          primary_image_url: 'https://images.example/exuma-primary.jpg',
          photo_url: 'https://images.example/exuma-fallback.jpg',
          highlights: ['Sandbars', 'Boat days'],
          getting_there: 'Fly from Nassau',
          days_recommended: '3-5 days',
          price_from: 620,
        }}
      />,
    )

    expect(screen.getByRole('link', { name: 'Read about The Exumas' })).toHaveAttribute(
      'href',
      '/explore/island/the-exumas',
    )
    expect(screen.getByText('View island guide')).toBeInTheDocument()
    expect(screen.getByText('Fly from Nassau')).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://images.example/exuma-primary.jpg')
  })

  test('destination card without imagery uses photo pending instead of decorative fallback art', () => {
    render(
      <RichCardRenderer
        cardData={{
          card_type: 'destination',
          name: 'Andros',
          island_id: 'andros',
          tagline: 'Blue holes and bonefishing',
          highlights: ['Blue holes', 'Nature'],
          getting_there: 'Fly from Nassau',
          days_recommended: '3-5 days',
        }}
      />,
    )

    expect(screen.getByText('Photo pending')).toBeInTheDocument()
    expect(screen.getByText('Island details are available. Destination image is not available yet.')).toBeInTheDocument()
    expect(screen.queryByAltText('Andros destination photo')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read about Andros' })).toHaveAttribute('href', '/explore/island/andros')
  })

  test('flight card exposes direct add-to-trip and booking route for LiteAPI offers', () => {
    const onAddToTrip = vi.fn()
    const onSendMessage = vi.fn()
    const card: CardData = {
      card_type: 'flight',
      airline: 'Bahamasair',
      route: 'MIA → NAS',
      departure: '10:00 AM',
      arrival: '11:00 AM',
      duration: '1h',
      stops: 'Direct',
      price: 345,
      currency: 'USD',
      passengers: 2,
      cabin_class: 'Economy',
      fare_brand: 'Main Cabin',
      baggage: { carry_on: true, checked: 1 },
      refundable: true,
      expiration: '2026-06-18T16:30:00Z',
      airline_logo_url: 'https://logos.example/bahamasair.svg',
      offer_id: 'lite-offer-123',
      provider_offer_id: 'lite-offer-123',
    }

    render(
      <RichCardRenderer
        cardData={card}
        activeTripId="trip-123"
        onAddToTrip={onAddToTrip}
        onSendMessage={onSendMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add to trip' }))

    expect(onAddToTrip).toHaveBeenCalledWith(card, 'trip-123')
    expect(onSendMessage).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Flight booking preview')).toBeInTheDocument()
    expect(screen.getByAltText('Bahamasair logo')).toHaveAttribute('src', 'https://logos.example/bahamasair.svg')
    expect(screen.getByAltText('Bahamasair logo')).toHaveClass('object-contain')
    expect(screen.getByAltText('Bahamasair logo')).toHaveStyle({ width: '44px', height: 'auto' })
    expect(screen.getByAltText('Bahamasair logo').className).not.toMatch(/border|rounded|bg-/)
    expect(screen.getByText('Main Cabin')).toBeInTheDocument()
    expect(screen.getByText('2 travelers')).toBeInTheDocument()
    expect(screen.getByText('Total for 2')).toBeInTheDocument()
    expect(screen.getByText('$173 each')).toBeInTheDocument()
    expect(screen.getByText('Non-stop')).toBeInTheDocument()
    expect(screen.getByText('Carry-on + 1 checked')).toBeInTheDocument()
    expect(screen.getByText('Refundable')).toBeInTheDocument()
    expect(screen.getByText(/Verify by Jun 18/i)).toBeInTheDocument()
    const href = screen.getByRole('link', { name: 'Book this fare' }).getAttribute('href') ?? ''
    const bookingUrl = new URL(href, 'https://bahabuddy.test')
    expect(bookingUrl.pathname).toBe('/flights/lite-offer-123/book')
    expect(bookingUrl.searchParams.get('route')).toBe('MIA → NAS')
    expect(bookingUrl.searchParams.get('airline')).toBe('Bahamasair')
    expect(bookingUrl.searchParams.get('departure')).toBe('10:00 AM')
    expect(bookingUrl.searchParams.get('arrival')).toBe('11:00 AM')
    expect(bookingUrl.searchParams.get('price')).toBe('345')
    expect(bookingUrl.searchParams.get('currency')).toBe('USD')
    expect(bookingUrl.searchParams.get('passengers')).toBe('2')
    expect(bookingUrl.searchParams.get('fare')).toBe('Main Cabin')
    expect(bookingUrl.searchParams.get('carryOn')).toBe('1')
    expect(bookingUrl.searchParams.get('checkedBags')).toBe('1')
    expect(screen.queryByRole('button', { name: 'Plan this flight' })).not.toBeInTheDocument()
  })

  test('flight card falls back to planning prompt without active trip context', () => {
    const onSendMessage = vi.fn()

    render(
      <RichCardRenderer
        cardData={{
          card_type: 'flight',
          airline: 'Bahamasair',
          route: 'MIA → NAS',
          offer_id: 'lite-offer-123',
        }}
        onSendMessage={onSendMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Plan this flight' }))

    expect(onSendMessage).toHaveBeenCalledWith('Help me save the Bahamasair option to my trip')
    const href = screen.getByRole('link', { name: 'Book this fare' }).getAttribute('href') ?? ''
    const bookingUrl = new URL(href, 'https://bahabuddy.test')
    expect(bookingUrl.pathname).toBe('/flights/lite-offer-123/book')
    expect(bookingUrl.searchParams.get('route')).toBe('MIA → NAS')
    expect(bookingUrl.searchParams.get('airline')).toBe('Bahamasair')
  })
})
