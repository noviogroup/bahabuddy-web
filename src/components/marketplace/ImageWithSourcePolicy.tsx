'use client'

import Image from 'next/image'
import { useState, type CSSProperties, type ReactNode } from 'react'

type ImageTone = 'brand' | 'stay' | 'restaurant' | 'activity' | 'deal' | 'island' | 'neutral'

type ImageWithSourcePolicyProps = {
  src?: string | null
  alt: string
  title: string
  eyebrow: string
  description?: string
  className?: string
  imageClassName?: string
  sizes?: string
  priority?: boolean
  unoptimized?: boolean
  pendingLabel?: string
  tone?: ImageTone
  style?: CSSProperties
  children?: ReactNode
}

const TONE_CLASS: Record<ImageTone, string> = {
  brand: 'from-gray-50 via-white to-gray-100 text-charcoal',
  stay: 'from-gray-50 via-white to-gray-100 text-charcoal',
  restaurant: 'from-gray-50 via-white to-gray-100 text-charcoal',
  activity: 'from-gray-50 via-white to-gray-100 text-charcoal',
  deal: 'from-gray-50 via-white to-gray-100 text-charcoal',
  island: 'from-gray-50 via-white to-gray-100 text-charcoal',
  neutral: 'from-gray-50 via-white to-gray-100 text-charcoal',
}

function validImageUrl(value: string | null | undefined): string | null {
  const url = value?.trim()
  if (!url || !/^https?:\/\//i.test(url)) return null
  return url
}

export default function ImageWithSourcePolicy({
  src,
  alt,
  title,
  eyebrow,
  description = 'Real item data is available. Photo is not available yet.',
  className = 'h-48',
  imageClassName = 'object-cover transition-transform duration-500 group-hover:scale-105',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  unoptimized = true,
  pendingLabel = 'Image pending',
  tone = 'brand',
  style,
  children,
}: ImageWithSourcePolicyProps) {
  const [failed, setFailed] = useState(false)
  const imageSrc = validImageUrl(src)
  const hasImage = Boolean(imageSrc && !failed)

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${TONE_CLASS[tone]} ${className}`} style={style}>
      {hasImage ? (
        <Image
          src={imageSrc as string}
          alt={alt}
          fill
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          className={imageClassName}
          sizes={sizes}
          unoptimized={unoptimized}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-4 text-night">
          <div className="flex justify-end">
            <span className="rounded-full bg-white/85 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-charcoal shadow-soft">
              {pendingLabel}
            </span>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] opacity-90">
              {eyebrow}
            </p>
            <p className="mt-1 max-w-[14rem] text-lg font-extrabold leading-tight">
              {title}
            </p>
            <p className="mt-1 max-w-[15rem] text-xs font-semibold leading-5 text-charcoal/70">
              {description}
            </p>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
