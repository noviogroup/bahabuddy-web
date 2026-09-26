'use client'

import Image from 'next/image'
import { useState } from 'react'

type TourCoverProps = {
  src?: string | null
  title: string
  illustration?: boolean
  sizes?: string
}

export default function TourCover(props: TourCoverProps) {
  // A replacement URL gets a fresh load state after a failed image.
  return <CoverImage key={props.src} {...props} />
}

function CoverImage({ src, title, illustration = false, sizes = '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw' }: TourCoverProps) {
  const [failed, setFailed] = useState(false)
  const imageUrl = src?.trim()
  const valid = imageUrl && (/^https:\/\//i.test(imageUrl) || /^\/(?!\/)/.test(imageUrl))
  const isIllustration = illustration || Boolean(imageUrl?.includes('-ai-illustration.'))

  return (
    <div className="relative aspect-video overflow-hidden bg-gray-100">
      {valid && !failed ? (
        <>
          <Image
            src={imageUrl}
            alt={isIllustration ? `Destination illustration for ${title}` : title}
            fill
            sizes={sizes}
            className="object-cover"
            unoptimized={!imageUrl.startsWith('/')}
            onError={() => setFailed(true)}
          />
          {isIllustration && (
            <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-night">
              AI illustration
            </span>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <span className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal">
            Route photo pending
          </span>
        </div>
      )}
    </div>
  )
}
