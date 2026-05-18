'use client'

/**
 * SuggestionChip — pill-shaped tappable hint above the chat input.
 *
 * Mobile reference: the chip row in chat_screen.dart that renders when
 *   _shouldShowChips() returns true. Chips fade in/out based on
 *   conversation phase and last message context.
 *
 * Variants:
 *   - default:  brand-tinted, the usual hint
 *   - gold:     gold-tinted, for "Book this" / commit-oriented suggestions
 *   - dim:      grey-tinted, for less-urgent secondary options
 */

import type { ReactNode } from 'react'

type Variant = 'default' | 'gold' | 'dim'

export interface SuggestionChipProps {
  /** Chip label — keep short (≤ 30 chars). */
  label: ReactNode
  onClick: () => void
  variant?: Variant
  icon?: ReactNode
  disabled?: boolean
  className?: string
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const VARIANT: Record<Variant, string> = {
  default: 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100 hover:border-brand-300',
  gold:    'bg-gold-50 text-gold-700 border-gold-200 hover:bg-gold-100 hover:border-gold-300',
  dim:     'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300',
}

export default function SuggestionChip({
  label,
  onClick,
  variant = 'default',
  icon,
  disabled,
  className,
}: SuggestionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all duration-200 animate-fade-in',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT[variant],
        className,
      )}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {label}
    </button>
  )
}

/**
 * SuggestionChipRow — convenience wrapper that lays out chips with proper
 * spacing and horizontal scroll on small screens.
 *
 * Use it directly in the chat panel above the input bar:
 *
 *   <SuggestionChipRow>
 *     <SuggestionChip label="Love it"   onClick={...} />
 *     <SuggestionChip label="Cheaper options" onClick={...} />
 *     <SuggestionChip label="Add activities"   onClick={...} variant="gold" />
 *   </SuggestionChipRow>
 */
export function SuggestionChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 -mx-1 scrollbar-thin scrollbar-track-transparent',
        className,
      )}
      style={{ scrollbarWidth: 'thin' }}
    >
      {children}
    </div>
  )
}
