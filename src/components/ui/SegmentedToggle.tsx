'use client'

/**
 * SegmentedToggle — pill-shaped tab switcher with sliding indicator.
 *
 * Used by:
 *  - Explore (Discover / Community)
 *  - My Trip (Timeline / Map / Budget)
 *
 * Mobile reference: _SegmentedToggle in explore_screen.dart and the
 * tab control in my_trip_screen.dart.
 *
 * The sliding indicator is pure CSS — the active option's background
 * pill animates left/right via `transform: translateX(...)`. Supports
 * 2 to 4 options.
 */

import { useMemo, type ReactNode } from 'react'

export interface SegmentedToggleOption<T extends string = string> {
  value: T
  label: ReactNode
  /** Optional icon shown left of the label. */
  icon?: ReactNode
}

export interface SegmentedToggleProps<T extends string = string> {
  options: SegmentedToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Width — default 'auto' (intrinsic), or 'full' for stretch. */
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  'aria-label'?: string
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const SIZE = {
  sm: { h: 'h-9',  text: 'text-xs',  px: 'px-3' },
  md: { h: 'h-11', text: 'text-sm',  px: 'px-4' },
  lg: { h: 'h-12', text: 'text-base', px: 'px-5' },
}

export default function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: SegmentedToggleProps<T>) {
  const activeIndex = useMemo(
    () => Math.max(0, options.findIndex((o) => o.value === value)),
    [options, value],
  )
  const widthPct = 100 / options.length
  const sz = SIZE[size]

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex items-center rounded-full bg-gray-100 p-1 select-none',
        sz.h,
        fullWidth && 'w-full',
        className,
      )}
    >
      {/* Sliding pill indicator */}
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out"
        style={{
          width: `calc(${widthPct}% - 4px)`,
          left: '4px',
          transform: `translateX(calc(${activeIndex} * (100% + 4px)))`,
        }}
      />

      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-200',
              sz.text,
              sz.px,
              isActive ? 'text-brand-700' : 'text-gray-500 hover:text-gray-700',
              !fullWidth && 'min-w-[6rem]',
            )}
          >
            {option.icon && <span aria-hidden="true">{option.icon}</span>}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
