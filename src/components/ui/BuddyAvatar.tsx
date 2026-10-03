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
  /**
   * Accessible name. Omit (the default) when the avatar is decorative, e.g.
   * inside a labelled button or next to visible "Buddy" text: it is then
   * hidden from assistive tech so it does not pollute the control's name.
   */
  label?: string
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
  label,
}: BuddyAvatarProps) {
  const px = SIZE_PX[size]

  const stateClass: Record<State, string> = {
    // Infinite animations stop for users who prefer reduced motion.
    idle:        'animate-breathe motion-reduce:animate-none',
    listening:   'animate-buddy-pulse motion-reduce:animate-none',
    thinking:    'animate-buddy-pulse motion-reduce:animate-none',
    excited:     'scale-110 transition-transform duration-300 motion-reduce:transition-none',
    presenting:  '',
    celebrating: 'scale-110 animate-buddy-pulse motion-reduce:animate-none',
    greeting:    'animate-breathe motion-reduce:animate-none',
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
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-visible',
        className,
      )}
      style={{ width: px, height: px }}
    >
      <div
        className={cn(
          'rounded-full overflow-hidden bg-gray-50 transition-all duration-300 motion-reduce:transition-none',
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
