import Image from 'next/image'
import {
  APP_STORE_BADGE_INTRINSIC,
  APP_STORE_BADGE_SRC,
  APP_STORE_URL,
  GOOGLE_PLAY_BADGE_INTRINSIC,
  GOOGLE_PLAY_BADGE_SRC,
  GOOGLE_PLAY_URL,
} from '@/lib/brand'

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface StoreBadgeLinksProps {
  className?: string
  /** Rendered badge height in pixels; width scales from intrinsic aspect ratio. */
  height?: number
}

export default function StoreBadgeLinks({ className, height = 44 }: StoreBadgeLinksProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-3', className)}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block shrink-0 rounded-md opacity-95 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-opacity"
        aria-label="Download on the App Store"
      >
        <Image
          src={APP_STORE_BADGE_SRC}
          alt=""
          width={APP_STORE_BADGE_INTRINSIC.width}
          height={APP_STORE_BADGE_INTRINSIC.height}
          className="w-auto object-contain"
          style={{ height }}
          sizes={`${Math.round(height * 3)}px`}
        />
      </a>
      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block shrink-0 rounded-md opacity-95 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-opacity"
        aria-label="Get it on Google Play"
      >
        <Image
          src={GOOGLE_PLAY_BADGE_SRC}
          alt=""
          width={GOOGLE_PLAY_BADGE_INTRINSIC.width}
          height={GOOGLE_PLAY_BADGE_INTRINSIC.height}
          className="w-auto object-contain"
          style={{ height }}
          sizes={`${Math.round(height * 3.4)}px`}
        />
      </a>
    </div>
  )
}
