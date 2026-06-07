'use client'

/**
 * BahaPageLoader — brand loading indicator.
 *
 * Logo and Buddy avatar orbit a small ring clockwise; the ring uses an
 * animated blue ↔ gold conic gradient to signal activity.
 */

import Image from 'next/image'
import { BUDDY_AVATAR_SRC, LOGO_SRC } from '@/lib/brand'

const DEFAULT_SIZE = 88
const SATELLITE_PX = 32
const RING_PX = 3

export interface BahaPageLoaderProps {
  /** Diameter of the orbit ring (px). Default 88. */
  size?: number
  className?: string
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function Satellite({ src, objectClass }: { src: string; objectClass: string }) {
  return (
    <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white shadow-soft ring-2 ring-white">
      <Image src={src} alt="" width={32} height={32} className={cn('h-full w-full', objectClass)} aria-hidden />
    </div>
  )
}

export default function BahaPageLoader({ size = DEFAULT_SIZE, className }: BahaPageLoaderProps) {
  const halfSat = SATELLITE_PX / 2

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Gradient ring — spins so blue and gold sweep around the track */}
      <div
        className="absolute inset-0 rounded-full animate-baha-loader-ring"
        style={{
          padding: RING_PX,
          background:
            'conic-gradient(from 0deg, #2E78D2 0%, #38BDF8 20%, #F5B731 50%, #F7C238 75%, #2E78D2 100%)',
        }}
      >
        <div className="h-full w-full rounded-full bg-offwhite" />
      </div>

      {/* Clockwise orbit */}
      <div className="absolute inset-0 animate-baha-orbit">
        <div
          className="absolute left-1/2"
          style={{ top: -halfSat, marginLeft: -halfSat }}
        >
          <div className="animate-baha-orbit-counter">
            <Satellite src={LOGO_SRC} objectClass="object-contain p-0.5" />
          </div>
        </div>
        <div
          className="absolute left-1/2"
          style={{ bottom: -halfSat, marginLeft: -halfSat }}
        >
          <div className="animate-baha-orbit-counter">
            <Satellite src={BUDDY_AVATAR_SRC} objectClass="object-cover" />
          </div>
        </div>
      </div>
    </div>
  )
}
