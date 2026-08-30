'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

interface StayPhotoGalleryProps {
  hotelName: string
  galleryUrls: string[]
  heroUrl: string
  photoCountLabel: string
}

interface StayMorePhotosGridProps {
  hotelName: string
  galleryUrls: string[]
  startIndex?: number
}

function normalizePhotos(galleryUrls: string[], heroUrl?: string) {
  const unique = new Set<string>()
  const urls = [...galleryUrls, heroUrl].filter((url): url is string => Boolean(url))
  return urls.filter((url) => {
    if (unique.has(url)) return false
    unique.add(url)
    return true
  })
}

function PhotoLightbox({
  hotelName,
  photos,
  activeIndex,
  onClose,
  onSelect,
}: {
  hotelName: string
  photos: string[]
  activeIndex: number | null
  onClose: () => void
  onSelect: (index: number) => void
}) {
  const activePhoto = activeIndex == null ? null : photos[activeIndex]
  const hasMultiple = photos.length > 1

  useEffect(() => {
    if (activeIndex == null) return undefined
    const currentIndex = activeIndex

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }

      if (!hasMultiple) return

      if (event.key === 'ArrowLeft') {
        onSelect((currentIndex - 1 + photos.length) % photos.length)
      }

      if (event.key === 'ArrowRight') {
        onSelect((currentIndex + 1) % photos.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, hasMultiple, onClose, onSelect, photos.length])

  if (activeIndex == null || !activePhoto) return null

  const thumbnailStart = Math.max(0, Math.min(activeIndex - 3, photos.length - 7))
  const thumbnails = photos.slice(thumbnailStart, thumbnailStart + 7)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${hotelName} photo gallery`}
      className="fixed inset-0 z-[90] bg-night/95 text-white"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-bold">{hotelName}</p>
            <p className="text-xs font-semibold text-white/70">
              Photo {activeIndex + 1} of {photos.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Close
          </button>
        </div>

        <div className="relative min-h-0 flex-1 px-3 py-4 sm:px-6">
          <div className="relative mx-auto h-full max-h-[72vh] max-w-6xl overflow-hidden rounded-baha-lg bg-black">
            <Image
              src={activePhoto}
              alt={`${hotelName} photo ${activeIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
              unoptimized
            />
          </div>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => onSelect((activeIndex - 1 + photos.length) % photos.length)}
                className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white px-4 py-3 text-sm font-bold text-night shadow-card transition-colors hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-white sm:block"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => onSelect((activeIndex + 1) % photos.length)}
                className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white px-4 py-3 text-sm font-bold text-night shadow-card transition-colors hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-white sm:block"
              >
                Next
              </button>
            </>
          )}
        </div>

        {hasMultiple && (
          <div className="border-t border-white/10 px-3 py-3 sm:px-6">
            <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto">
              {thumbnails.map((photo, offset) => {
                const photoIndex = thumbnailStart + offset
                const selected = photoIndex === activeIndex

                return (
                  <button
                    key={`${photo}-${photoIndex}`}
                    type="button"
                    aria-label={`Show photo ${photoIndex + 1}`}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => onSelect(photoIndex)}
                    className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-baha-sm border transition ${
                      selected ? 'border-gold-400 ring-2 ring-gold-400' : 'border-white/20 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={photo}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StayPhotoGallery({
  hotelName,
  galleryUrls,
  heroUrl,
  photoCountLabel,
}: StayPhotoGalleryProps) {
  const photos = useMemo(() => normalizePhotos(galleryUrls, heroUrl), [galleryUrls, heroUrl])
  const galleryPreview = photos.slice(0, 5)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const mediaNote = photos.length > 1
    ? 'Browse the photos before choosing the room.'
    : 'More gallery photos appear here when available.'

  return (
    <>
      <div className={`relative overflow-hidden rounded-baha-xl bg-stone-100 shadow-sm ${galleryPreview.length > 1 ? 'grid gap-1.5 lg:grid-cols-[1.55fr_0.9fr]' : ''}`}>
        <button
          type="button"
          onClick={() => setActiveIndex(0)}
          className={`group relative block w-full bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${galleryPreview.length > 1 ? 'aspect-[16/10] lg:aspect-[16/8.8]' : 'aspect-[16/7]'}`}
          aria-label={`Open ${hotelName} photo 1`}
        >
          <Image
            src={galleryPreview[0] ?? heroUrl}
            alt={hotelName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            priority
            sizes="(max-width: 1024px) 100vw, 72rem"
            unoptimized
          />
        </button>

        {galleryPreview.length > 1 && (
          <div className="grid grid-cols-2 gap-1.5">
            {galleryPreview.slice(1, 5).map((url, idx) => {
              const photoIndex = idx + 1

              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveIndex(photoIndex)}
                  className="group relative min-h-28 overflow-hidden bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  aria-label={`Open ${hotelName} photo ${photoIndex + 1}`}
                >
                  <Image
                    src={url}
                    alt={`${hotelName} photo ${photoIndex + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 768px) 50vw, 16vw"
                    unoptimized
                  />
                </button>
              )
            })}
          </div>
        )}

        {photos.length > 5 && (
          <button
            type="button"
            onClick={() => setActiveIndex(0)}
            className="absolute bottom-4 right-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-night shadow-soft transition-colors hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            View all photos
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="font-semibold text-night">{photoCountLabel}</p>
        <p className="text-charcoal">{mediaNote}</p>
      </div>

      <PhotoLightbox
        hotelName={hotelName}
        photos={photos}
        activeIndex={activeIndex}
        onClose={() => setActiveIndex(null)}
        onSelect={setActiveIndex}
      />
    </>
  )
}

export function StayMorePhotosGrid({ hotelName, galleryUrls, startIndex = 5 }: StayMorePhotosGridProps) {
  const photos = useMemo(() => normalizePhotos(galleryUrls), [galleryUrls])
  const visiblePhotos = photos.slice(startIndex, startIndex + 9)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (visiblePhotos.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {visiblePhotos.map((url, idx) => {
          const photoIndex = startIndex + idx

          return (
            <button
              key={`${url}-${photoIndex}`}
              type="button"
              onClick={() => setActiveIndex(photoIndex)}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              aria-label={`Open ${hotelName} photo ${photoIndex + 1}`}
            >
              <Image
                src={url}
                alt={`${hotelName} photo ${photoIndex + 1}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 33vw"
                unoptimized
              />
            </button>
          )
        })}
      </div>

      <PhotoLightbox
        hotelName={hotelName}
        photos={photos}
        activeIndex={activeIndex}
        onClose={() => setActiveIndex(null)}
        onSelect={setActiveIndex}
      />
    </>
  )
}
