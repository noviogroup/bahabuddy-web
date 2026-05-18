'use client'

/**
 * EmptySlot — dotted-outline placeholder for unfilled trip time slots.
 *
 * Mobile reference: the "Add something to Day 3 afternoon" placeholder
 *   shown for empty time slots in my_trip_screen.dart timeline view.
 *
 * Tapping opens the chat with that slot pre-loaded as context, e.g.
 *   "Help me plan something for Day 3 afternoon"
 *
 * Visual: dotted border that softens to brand color on hover. Subtle plus
 * icon at the leading edge.
 */

import type { ReactNode } from 'react'

export interface EmptySlotProps {
  /** Slot label — e.g. "Add to Day 3 afternoon". */
  label: ReactNode
  /** Optional secondary line — e.g. "Tap to ask Buddy". */
  hint?: string
  onClick: () => void
  /** Optional icon. Defaults to plus. */
  icon?: ReactNode
  /** Size tuning. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'py-3 px-4 text-xs',
  md: 'py-4 px-5 text-sm',
  lg: 'py-5 px-6 text-base',
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const DEFAULT_ICON = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
)

export default function EmptySlot({
  label,
  hint,
  onClick,
  icon,
  size = 'md',
  className,
}: EmptySlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 rounded-baha-md border-2 border-dashed border-gray-300 bg-transparent',
        'text-gray-500 transition-all duration-200',
        'hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700',
        'focus-visible:outline-none focus-visible:border-brand-500 focus-visible:bg-brand-50',
        'active:bg-brand-100',
        SIZE[size],
        className,
      )}
    >
      <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 transition-colors group-hover:bg-brand-100">
        {icon ?? DEFAULT_ICON}
      </span>
      <span className="flex flex-col items-start text-left flex-1 min-w-0">
        <span className="font-semibold truncate w-full">{label}</span>
        {hint && <span className="text-xs text-gray-400 mt-0.5">{hint}</span>}
      </span>
    </button>
  )
}
