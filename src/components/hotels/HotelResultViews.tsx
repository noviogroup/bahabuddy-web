'use client'

import Link from 'next/link'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import type { CardData } from '@/components/RichCards'

export type HotelViewMode = 'list' | 'grid'

interface HotelDisplay {
  name: string
  location: string
  rating: number
  stars: number
  reviews: number
  chain?: string
  photoUrl?: string
  previewReason: string
  pricePerNight: number | null
  priceIsEstimate: boolean
  amenities: string[]
  href: string | null
}

function imageUrlFromValue(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    for (const key of ['url', 'photo_url', 'photoUrl', 'image_url', 'imageUrl', 'storage_url', 'storageUrl', 'src']) {
      const url = imageUrlFromValue(record[key])
      if (url) return url
    }
    return undefined
  }
  if (typeof value !== 'string') return undefined
  const url = value.trim()
  return /^https?:\/\//i.test(url) ? url : undefined
}

function hotelImageUrl(data: CardData): string | undefined {
  for (const key of [
    'primary_image_url',
    'photo_url',
    'image_url',
    'hero_image_url',
    'photo',
    'thumbnail',
  ] as const) {
    const url = imageUrlFromValue(data[key])
    if (url) return url
  }

  for (const key of ['image_urls', 'gallery_images', 'photos'] as const) {
    const values = data[key]
    if (Array.isArray(values)) {
      for (const value of values) {
        const url = imageUrlFromValue(value)
        if (url) return url
      }
    } else {
      const url = imageUrlFromValue(values)
      if (url) return url
    }
  }

  return undefined
}

function hotelPreviewReason(data: CardData): string {
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'This stay'
  const island = data.island ?? data.city ?? 'The Bahamas'
  const amenities = (data.amenities ?? []).filter(Boolean)

  if ((data.stars ?? 0) >= 4 && (data.rating ?? 0) >= 4.4) {
    return `${name} pairs a ${data.stars}-star stay profile with strong traveler ratings on ${island}.`
  }

  if ((data.rating ?? 0) >= 4.5) {
    return `Strong guest rating for travelers comparing stays on ${island}.`
  }

  if (amenities.length > 0) {
    return `Good fit for ${amenities.slice(0, 2).join(' and ').toLowerCase()} stay plans.`
  }

  if (data.chain) {
    return `${data.chain} option to compare against independent Bahamas stays.`
  }

  return `Useful stay preview to compare location, rating, and nightly price before opening details.`
}

function getHotelDisplay(data: CardData): HotelDisplay {
  const pricePerNight =
    data.price_per_night != null && data.price_per_night > 0
      ? data.price_per_night
      : null

  return {
    name: (typeof data.name === 'string' && data.name.trim()) ? data.name.trim() : 'Hotel',
    location: data.island ?? data.city ?? '',
    rating: data.rating ?? 0,
    stars: data.stars ?? 0,
    reviews: data.review_count ?? 0,
    chain: data.chain,
    photoUrl: hotelImageUrl(data),
    previewReason: hotelPreviewReason(data),
    pricePerNight,
    priceIsEstimate: data.price_is_estimate ?? false,
    amenities: data.amenities ?? [],
    href: data.place_id ? `/stays/${encodeURIComponent(data.place_id)}` : null,
  }
}

function Stars({ count }: { count: number }) {
  const filled = Math.min(5, Math.max(0, count))
  return (
    <span className="text-charcoal text-xs font-semibold leading-none">
      {filled}-star
    </span>
  )
}

function HotelPhoto({
  photoUrl,
  title,
  className,
}: {
  photoUrl?: string
  title: string
  className?: string
}) {
  return (
    <ImageWithSourcePolicy
      src={photoUrl}
      alt={title}
      title={title}
      eyebrow="Stay"
      description="Stay details are available. Provider photo is not available yet."
      pendingLabel="Photo pending"
      className={className}
      imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 640px) 100vw, 320px"
      tone="stay"
    />
  )
}

function HotelInfoBlock({
  hotel,
  variant,
}: {
  hotel: HotelDisplay
  variant: 'list' | 'grid'
}) {
  const isGrid = variant === 'grid'
  const titleClass = isGrid
    ? 'font-bold text-white text-base leading-snug line-clamp-2 drop-shadow-sm'
    : 'font-semibold text-night text-sm leading-tight line-clamp-2'
  const metaClass = isGrid ? 'text-white/80 text-xs mt-0.5' : 'text-gray-500 text-xs mt-0.5'
  const ratingClass = isGrid ? 'text-white/90 text-xs font-medium' : 'text-gray-700 text-xs font-medium'

  return (
    <>
      <p className={titleClass}>{hotel.name}</p>
      {(hotel.location || hotel.chain) && (
        <p className={metaClass}>
          {hotel.location}
          {hotel.chain ? `${hotel.location ? ' · ' : ''}${hotel.chain}` : ''}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap mt-1.5">
        {hotel.stars > 0 && <Stars count={hotel.stars} />}
        {hotel.rating > 0 && (
          <span className={ratingClass}>
            Rating {hotel.rating}
            {hotel.reviews > 0 ? ` (${hotel.reviews.toLocaleString()})` : ''}
          </span>
        )}
      </div>
      {!isGrid && hotel.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {hotel.amenities.slice(0, 3).map(a => (
            <span
              key={a}
              className="text-[11px] bg-gray-100 text-charcoal rounded-full px-2 py-0.5"
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </>
  )
}

function PriceTag({
  hotel,
  variant,
}: {
  hotel: HotelDisplay
  variant: 'list' | 'grid'
}) {
  if (hotel.pricePerNight == null) return null

  const amount = `$${Math.round(hotel.pricePerNight).toLocaleString()}`

  if (variant === 'grid') {
    return (
      <p className="text-white mt-2 leading-tight">
        {hotel.priceIsEstimate && (
          <span className="text-white/70 text-[11px] font-medium uppercase tracking-wide block">
            From
          </span>
        )}
        <span className="font-bold text-lg">{amount}</span>
        <span className="text-white/75 text-xs font-normal"> /night</span>
      </p>
    )
  }

  return (
    <div className="text-left sm:text-right shrink-0 sm:pl-2 w-full sm:w-auto">
      {hotel.priceIsEstimate && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 block">
          From
        </span>
      )}
      <span className="text-lg font-bold text-brand-600">{amount}</span>
      <span className="text-xs text-gray-400 block">per night</span>
    </div>
  )
}

function HotelListCard({ data }: { data: CardData }) {
  const hotel = getHotelDisplay(data)
  const shellClass =
    'group flex flex-col sm:flex-row rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2'

  const inner = (
    <>
      <div className="relative w-full h-36 sm:w-44 sm:min-h-44 sm:shrink-0">
        <HotelPhoto photoUrl={hotel.photoUrl} title={hotel.name} className="h-full w-full" />
        <div
          className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/20 via-transparent to-transparent sm:from-black/10 sm:via-white/40 sm:to-white pointer-events-none"
          aria-hidden="true"
        />
      </div>
      <div className="relative flex flex-1 min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-3 px-4 py-3 bg-white">
        <div className="flex-1 min-w-0 space-y-2">
          <HotelInfoBlock hotel={hotel} variant="list" />
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
              Why Buddy picked this
            </p>
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-charcoal">
              {hotel.previewReason}
            </p>
          </div>
        </div>
        <PriceTag hotel={hotel} variant="list" />
      </div>
    </>
  )

  if (hotel.href) {
    return (
      <Link href={hotel.href} aria-label={`View details for ${hotel.name}`} className={shellClass}>
        {inner}
      </Link>
    )
  }
  return <div className={shellClass}>{inner}</div>
}

function HotelGridCard({ data }: { data: CardData }) {
  const hotel = getHotelDisplay(data)
  const shellClass =
    'group relative block aspect-[4/5] rounded-2xl overflow-hidden shadow-md border border-gray-100 transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2'

  const inner = (
    <>
      <HotelPhoto
        photoUrl={hotel.photoUrl}
        title={hotel.name}
        className="absolute inset-0 h-full w-full"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/55 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end p-4 pt-12 min-h-[45%]">
        <HotelInfoBlock hotel={hotel} variant="grid" />
        <PriceTag hotel={hotel} variant="grid" />
      </div>
    </>
  )

  if (hotel.href) {
    return (
      <Link href={hotel.href} aria-label={`View details for ${hotel.name}`} className={shellClass}>
        {inner}
      </Link>
    )
  }
  return <div className={shellClass}>{inner}</div>
}

export function HotelResultsSkeleton({ mode }: { mode: HotelViewMode }) {
  if (mode === 'grid') {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4"
        aria-live="polite"
        aria-busy="true"
      >
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="aspect-[4/5] rounded-2xl bg-gray-100 border border-gray-100 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="h-32 sm:h-36 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse"
        />
      ))}
    </div>
  )
}

export function HotelResultsList({
  results,
  mode,
}: {
  results: CardData[]
  mode: HotelViewMode
}) {
  if (mode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
        {results.map((card, idx) => (
          <HotelGridCard key={card.place_id ?? idx} data={card} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {results.map((card, idx) => (
        <HotelListCard key={card.place_id ?? idx} data={card} />
      ))}
    </div>
  )
}
