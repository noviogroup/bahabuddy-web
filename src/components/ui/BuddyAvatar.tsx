'use client'

/**
 * BuddyAvatar — the visual embodiment of Buddy on web.
 *
 * Uses /public/brand/buddy-avatar.png by default. State animations apply
 * over the image (breathing and pulse states).
 *
 * Mobile reference: lib/shared/widgets/buddy_avatar.dart (sizes + states)
 */

import Image from 'next/image'
import { BUDDY_AVATAR_SRC } from '@/lib/brand'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type State = 'idle' | 'listening' | 'thinking' | 'excited' | 'presenting' | 'celebrating' | 'greeting'

export interface BuddyAvatarProps {
  size?: Size
  state?: State
  /** Override illustration URL (defaults to brand buddy avatar). */
  src?: string
  className?: string
}

const SIZE_PX: Record<Size, number> = {
  xs: 24,
  sm: 36,
  md: 56,
  lg: 80,
  xl: 120,
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export default function BuddyAvatar({
  size = 'md',
  state = 'idle',
  src = BUDDY_AVATAR_SRC,
  className,
}: BuddyAvatarProps) {
  const px = SIZE_PX[size]

  const stateClass: Record<State, string> = {
    idle:        'animate-breathe',
    listening:   'animate-buddy-pulse',
    thinking:    'animate-buddy-pulse',
    excited:     'scale-110 transition-transform duration-300',
    presenting:  '',
    celebrating: 'scale-110 animate-buddy-pulse',
    greeting:    'animate-breathe',
  }

  const ringClass: Record<State, string> = {
    idle:        '',
    listening:   'ring-2 ring-gray-300 ring-offset-2 ring-offset-white',
    thinking:    '',
    excited:     '',
    presenting:  '',
    celebrating: 'ring-2 ring-gray-400 ring-offset-2 ring-offset-white',
    greeting:    '',
  }

  return (
    <div
      role="img"
      aria-label={`Buddy avatar — ${state}`}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-visible',
        className,
      )}
      style={{ width: px, height: px }}
    >
      <div
        className={cn(
          'rounded-full overflow-hidden bg-gray-50 transition-all duration-300',
          stateClass[state],
          ringClass[state],
        )}
        style={{ width: px, height: px }}
      >
        <Image
          src={src}
          alt=""
          width={px}
          height={px}
          className="object-cover w-full h-full"
        />
      </div>
    </div>
  )
}
