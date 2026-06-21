'use client'

import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'

type StayCardImageProps = {
  src: string | null
  alt: string
  island?: string | null
  propertyType?: string | null
  priority?: boolean
}

export default function StayCardImage({
  src,
  alt,
  island,
  propertyType,
  priority = false,
}: StayCardImageProps) {
  return (
    <ImageWithSourcePolicy
      src={src}
      alt={alt}
      title={`${propertyType || 'Stay'} in ${island || 'The Bahamas'}`}
      eyebrow="Baha Buddy stay"
      description="Property photo is not available yet. Confirm details before booking."
      className="h-48"
      priority={priority}
      tone="stay"
    />
  )
}
