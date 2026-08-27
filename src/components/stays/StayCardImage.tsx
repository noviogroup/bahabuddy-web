'use client'

import Link from 'next/link'
import { useMemo, useState, type MouseEvent } from 'react'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'

type StayCardImageProps = {
  src: string | null
  photos?: string[]
  alt: string
  island?: string | null
  propertyType?: string | null
  href?: string
  priority?: boolean
}

function usableImageUrls(src: string | null, photos: string[] = []): string[] {
  const urls = new Set<string>()
  for (const value of [src, ...photos]) {
    const url = value?.trim()
    if (url && /^https?:\/\//i.test(url)) urls.add(url)
  }
  return Array.from(urls)
}

const galleryButtonClass =
  'absolute top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white text-night shadow-md ring-2 ring-white/90 transition hover:border-brand-300 hover:bg-white hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2'

export default function StayCardImage({
  src,
  photos,
  alt,
  island,
  propertyType,
  href,
  priority = false,
}: StayCardImageProps) {
  const imageUrls = useMemo(() => usableImageUrls(src, photos), [src, photos])
  const [activeIndex, setActiveIndex] = useState(0)
  const activeSrc = imageUrls[activeIndex] ?? src
  const hasGallery = imageUrls.length > 1

  function moveImage(event: MouseEvent<HTMLButtonElement>, direction: 1 | -1) {
    event.preventDefault()
    event.stopPropagation()
    setActiveIndex((current) => (current + direction + imageUrls.length) % imageUrls.length)
  }

  return (
    <ImageWithSourcePolicy
      src={activeSrc}
      alt={alt}
      title={`${propertyType || 'Stay'} in ${island || 'The Bahamas'}`}
      eyebrow="Baha Buddy stay"
      className="h-48"
      priority={priority}
      tone="stay"
    >
      {href && (
        <Link
          href={href}
          aria-label={`View ${alt}`}
          className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2"
        />
      )}

      {hasGallery && (
        <>
          <button
            type="button"
            aria-label={`Previous photo of ${alt}`}
            onClick={(event) => moveImage(event, -1)}
            className={`${galleryButtonClass} left-3`}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Next photo of ${alt}`}
            onClick={(event) => moveImage(event, 1)}
            className={`${galleryButtonClass} right-3`}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/92 px-2.5 py-1 text-xs font-semibold text-night shadow-sm ring-1 ring-gray-200">
            {activeIndex + 1}/{imageUrls.length}
          </span>
        </>
      )}
    </ImageWithSourcePolicy>
  )
}
