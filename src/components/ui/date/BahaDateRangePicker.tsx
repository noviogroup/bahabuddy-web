'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import './baha-date-picker.css'
import {
  clampEndAfterStart,
  dateToIso,
  formatRangeLabel,
  isoToDate,
  nightsBetween,
  startOfToday,
  todayIso,
} from '@/lib/date-utils'
import { useCalendarMonths } from './useCalendarMonths'

export interface BahaDateRangePickerProps {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  /** `inline` — calendar always visible (modals). `field` — popover trigger (forms). */
  layout?: 'inline' | 'field'
  label?: string
  placeholder?: string
  minDate?: string
  className?: string
  id?: string
  showNights?: boolean
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

export default function BahaDateRangePicker({
  start,
  end,
  onChange,
  layout = 'field',
  label,
  placeholder = 'Add dates',
  minDate,
  className = '',
  id: idProp,
  showNights = true,
}: BahaDateRangePickerProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const months = useCalendarMonths(2)

  const min = isoToDate(minDate ?? todayIso()) ?? startOfToday()
  const selected: DateRange | undefined = {
    from: isoToDate(start),
    to: isoToDate(end),
  }

  const nights = showNights && start && end ? nightsBetween(start, end) : null

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      if (!range?.from) {
        onChange('', '')
        return
      }
      const nextStart = dateToIso(range.from)
      const nextEnd = range.to ? dateToIso(range.to) : ''
      onChange(nextStart, nextEnd ? clampEndAfterStart(nextStart, nextEnd) : '')
      if (layout === 'field' && range.from && range.to) {
        setOpen(false)
      }
    },
    [onChange, layout],
  )

  useEffect(() => {
    if (layout !== 'field' || !open) return
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [layout, open])

  const calendar = (
    <DayPicker
      mode="range"
      numberOfMonths={months}
      selected={selected}
      onSelect={handleSelect}
      disabled={{ before: min }}
      showOutsideDays
      className="baha-date-picker"
      defaultMonth={isoToDate(start) ?? isoToDate(end) ?? min}
    />
  )

  if (layout === 'inline') {
    return (
      <div id={id} className={className}>
        {label && (
          <p className="text-xs text-gray-500 font-semibold mb-2">{label}</p>
        )}
        <div className="rounded-baha-md border border-gray-200 bg-white p-3 shadow-soft overflow-x-auto">
          {calendar}
        </div>
        {nights != null && (
          <p className="text-sm text-charcoal font-semibold mt-2">
            {nights} night{nights !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    )
  }

  const display = formatRangeLabel(start, end, placeholder)

  return (
    <div ref={rootRef} id={id} className={`relative ${className}`}>
      {label && (
        <span className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`w-full flex items-center gap-2 rounded-baha-md border bg-white px-3 py-2.5 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-500 ${
          open ? 'border-gray-500 ring-2 ring-gray-100' : 'border-gray-300 hover:border-gray-400'
        } ${!start && !end ? 'text-gray-400' : 'text-night font-medium'}`}
      >
        <CalendarIcon className="w-5 h-5 shrink-0 text-charcoal" />
        <span className="flex-1 truncate">{display}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label ?? 'Choose dates'}
          className="absolute z-50 mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:min-w-[min(100%,680px)] rounded-baha-lg border border-gray-200 bg-white p-4 shadow-card-hover overflow-x-auto"
        >
          {calendar}
          {nights != null && (
            <p className="text-sm text-charcoal font-semibold mt-3 text-center border-t border-gray-100 pt-3">
              {nights} night{nights !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
