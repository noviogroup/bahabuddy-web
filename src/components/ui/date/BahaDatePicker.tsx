'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import './baha-date-picker.css'
import { dateToIso, formatDateShort, isoToDate, startOfToday, todayIso } from '@/lib/date-utils'
import { useCalendarMonths } from './useCalendarMonths'

export interface BahaDatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  minDate?: string
  maxDate?: string
  layout?: 'inline' | 'field'
  className?: string
  id?: string
  name?: string
  required?: boolean
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

export default function BahaDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  minDate,
  maxDate,
  layout = 'field',
  className = '',
  id: idProp,
  name,
  required,
}: BahaDatePickerProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const months = useCalendarMonths(1)

  const min = isoToDate(minDate ?? todayIso()) ?? startOfToday()
  const max = isoToDate(maxDate)
  const selected = isoToDate(value)

  const disabled = max ? { before: min, after: max } : { before: min }

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        onChange('')
        return
      }
      onChange(dateToIso(date))
      if (layout === 'field') setOpen(false)
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
      mode="single"
      numberOfMonths={months}
      selected={selected}
      onSelect={handleSelect}
      disabled={disabled}
      showOutsideDays
      className="baha-date-picker"
      defaultMonth={selected ?? min}
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
        {name && (
          <input type="hidden" name={name} value={value} required={required} readOnly />
        )}
      </div>
    )
  }

  const display = value ? formatDateShort(value) : placeholder

  return (
    <div ref={rootRef} id={id} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={`${id}-trigger`}
          className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1"
        >
          {label}
        </label>
      )}
      <button
        id={`${id}-trigger`}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`w-full flex items-center gap-2 rounded-baha-md border bg-white px-3 py-2.5 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 ${
          open ? 'border-brand-500 ring-2 ring-brand-100' : 'border-gray-300 hover:border-gray-400'
        } ${!value ? 'text-gray-400' : 'text-night font-medium'}`}
      >
        <CalendarIcon className="w-5 h-5 shrink-0 text-brand-500" />
        <span className="flex-1 truncate">{display}</span>
      </button>
      {name && (
        <input type="hidden" name={name} value={value} required={required} readOnly tabIndex={-1} />
      )}

      {open && (
        <div
          role="dialog"
          aria-label={label ?? 'Choose date'}
          className="absolute z-50 mt-2 left-0 right-0 sm:left-auto sm:min-w-[320px] rounded-baha-lg border border-gray-200 bg-white p-4 shadow-card-hover"
        >
          {calendar}
        </div>
      )}
    </div>
  )
}
