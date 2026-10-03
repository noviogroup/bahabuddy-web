'use client'

import { TRIP_STYLES, type TripStyle } from '@/lib/trip-styles'

/**
 * Compact multi-select "What kind of trip?" row: label-size pills (~36px
 * visual, 44px tap row) that scroll sideways on phones instead of wrapping,
 * so the row height never changes when a choice is restored after mount.
 */
export default function TripStylePicker({
  selected,
  onToggle,
  onClear,
  label = 'What kind of trip?',
}: {
  selected: readonly TripStyle[]
  onToggle: (style: TripStyle) => void
  onClear: () => void
  label?: string
}) {
  return (
    <div role="group" aria-label={label} data-testid="trip-style-picker" className="min-w-0">
      <p className="mb-2 text-xs font-bold uppercase text-night">{label}</p>
      <div className="-mx-1 flex min-h-11 items-center gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TRIP_STYLES.map((style) => {
          const active = selected.includes(style.slug)
          return (
            <button
              key={style.slug}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(style.slug)}
              className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1 ${
                active
                  ? 'border-brand-600 bg-brand-50 text-brand-800'
                  : 'border-gray-200 bg-white text-charcoal hover:border-gray-300 hover:bg-gray-50 hover:text-night'
              }`}
            >
              {style.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onClear}
          aria-hidden={selected.length === 0}
          tabIndex={selected.length === 0 ? -1 : 0}
          className={`inline-flex h-9 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-gray-500 hover:text-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
            selected.length === 0 ? 'invisible' : ''
          }`}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
