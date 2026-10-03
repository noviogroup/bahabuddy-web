import { describe, expect, test } from 'vitest'
import { photoSourceLabel, toPublicPhotoUrl } from '@/lib/provider-photo-url'

describe('toPublicPhotoUrl', () => {
  test('rewrites legacy Google place photo URLs to the same-origin proxy without the key', () => {
    const url = toPublicPhotoUrl('https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=AbC_123-x&key=SECRET')
    expect(url).toBe('/api/place-photo?ref=AbC_123-x&w=1200')
    expect(url).not.toContain('SECRET')
  })

  test('drops URLs that carry credentials or point at Places API media', () => {
    expect(toPublicPhotoUrl('https://cdn.example.com/a.jpg?key=SECRET')).toBeNull()
    expect(toPublicPhotoUrl('https://places.googleapis.com/v1/places/x/photos/y/media?maxWidthPx=800')).toBeNull()
    expect(toPublicPhotoUrl('https://maps.googleapis.com/maps/api/place/photo?photoreference=bad%20ref&key=S')).toBeNull()
  })

  test('keeps ordinary image URLs and same-origin paths', () => {
    expect(toPublicPhotoUrl('https://images.example.com/beach.jpg?w=800')).toBe('https://images.example.com/beach.jpg?w=800')
    expect(toPublicPhotoUrl('/assets/tourism/beach.webp')).toBe('/assets/tourism/beach.webp')
    expect(toPublicPhotoUrl('//evil.example.com/x.jpg')).toBeNull()
    expect(toPublicPhotoUrl(null)).toBeNull()
  })

  test('labels photo sources for attribution', () => {
    expect(photoSourceLabel('google_places')).toBe('Google')
    expect(photoSourceLabel('foursquare')).toBe('Foursquare')
    expect(photoSourceLabel('island_partner')).toBe('Island Partner')
    expect(photoSourceLabel(null)).toBeNull()
  })
})
