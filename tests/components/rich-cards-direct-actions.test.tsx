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
    }

    render(
      <RichCardRenderer
        cardData={card}
        activeTripId="trip-123"
        onAddToTrip={onAddToTrip}
        onSendMessage={onSendMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /expand goldwynn resort for more info/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onAddToTrip).toHaveBeenCalledWith(card, 'trip-123')
    expect(onSendMessage).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /view full details/i })).toHaveAttribute('href', '/stays/goldwynn-resort')
  })

  test('hotel card falls back to Buddy prompt when no active trip is available', () => {
    const onAddToTrip = vi.fn()
    const onSendMessage = vi.fn()

    render(
      <RichCardRenderer
        cardData={{ card_type: 'hotel', place_id: 'sls-baha-mar', name: 'SLS Baha Mar' }}
        onAddToTrip={onAddToTrip}
        onSendMessage={onSendMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /expand sls baha mar for more info/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onAddToTrip).not.toHaveBeenCalled()
    expect(onSendMessage).toHaveBeenCalledWith('Help me add SLS Baha Mar to my trip')
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
    expect(screen.getByRole('link', { name: 'Book this fare' })).toHaveAttribute('href', '/flights/lite-offer-123/book')
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
    expect(screen.getByRole('link', { name: 'Book this fare' })).toHaveAttribute('href', '/flights/lite-offer-123/book')
  })
})
