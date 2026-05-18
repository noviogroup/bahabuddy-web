'use client'

/**
 * BuddyAvatar — the visual embodiment of Buddy on web.
 *
 * Uses /public/brand/buddy-avatar.png by default. State animations apply
 * over the image (breathing, pulse ring, thinking dots).
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

/** Three-dot thinking indicator overlaid on the avatar when state === 'thinking'. */
function ThinkingDots() {
  return (
    <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-white rounded-full px-1.5 py-1 shadow-card">
      <span className="w-1 h-1 bg-brand-500 rounded-full animate-buddy-think" style={{ animationDelay: '0ms' }} />
      <span className="w-1 h-1 bg-brand-500 rounded-full animate-buddy-think" style={{ animationDelay: '150ms' }} />
      <span className="w-1 h-1 bg-brand-500 rounded-full animate-buddy-think" style={{ animationDelay: '300ms' }} />
    </div>
  )
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
    thinking:    '',
    excited:     'scale-110 transition-transform duration-300',
    presenting:  '',
    celebrating: 'scale-110 animate-buddy-pulse',
    greeting:    'animate-breathe',
  }

  const ringClass: Record<State, string> = {
    idle:        '',
    listening:   'ring-2 ring-brand-300 ring-offset-2 ring-offset-white',
    thinking:    '',
    excited:     '',
    presenting:  '',
    celebrating: 'ring-2 ring-gold-400 ring-offset-2 ring-offset-white',
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
          'rounded-full overflow-hidden bg-brand-50 transition-all duration-300',
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

      {state === 'thinking' && <ThinkingDots />}
    </div>
  )
}
