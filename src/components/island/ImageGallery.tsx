'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  images: string[]
  alt: string
}

export default function ImageGallery({ images, alt }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  if (images.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.slice(0, 9).map((url, idx) => (
          <button
            key={url}
            type="button"
            onClick={() => setSelectedIdx(idx)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
          >
            <Image
              src={url}
              alt={`${alt} — photo ${idx + 1}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 33vw"
              unoptimized
            />
          </button>
        ))}
      </div>

      {selectedIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedIdx(null)}
          role="dialog"
          aria-label="Image viewer"
        >
          <button
            type="button"
            onClick={() => setSelectedIdx(null)}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative max-h-[85vh] max-w-[90vw] w-full aspect-[4/3]" onClick={e => e.stopPropagation()}>
            <Image
              src={images[selectedIdx]}
              alt={`${alt} — photo ${selectedIdx + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              unoptimized
            />
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setSelectedIdx((selectedIdx - 1 + images.length) % images.length)}
                className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
                aria-label="Previous"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                {selectedIdx + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIdx((selectedIdx + 1) % images.length)}
                className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
                aria-label="Next"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
