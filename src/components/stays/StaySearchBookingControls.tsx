'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import BahaDateRangePicker from '@/components/ui/date/BahaDateRangePicker'

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export const STAY_COMPACT_SEARCH_CONTROL_CLASS_NAME = '!h-8 !rounded-none !border-0 !bg-transparent !px-0 !py-0 !text-sm !font-medium !text-night !shadow-none !outline-none !ring-0 hover:!border-transparent focus:!border-transparent focus:!bg-transparent focus:!ring-0'

type StaySearchIconName = 'pin' | 'calendar' | 'bed' | 'guests'

function StaySearchIcon({ name }: { name: StaySearchIconName }) {
  const common = 'h-4 w-4'
  if (name === 'calendar') {
    return (
      <svg className={common} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5.5 2.5v3M14.5 2.5v3M3.5 7.5h13M4.2 4.5h11.6c.7 0 1.2.5 1.2 1.2v10.1c0 .7-.5 1.2-1.2 1.2H4.2c-.7 0-1.2-.5-1.2-1.2V5.7c0-.7.5-1.2 1.2-1.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'bed') {
    return (
      <svg className={common} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3.5 5.5v9M16.5 10.5v4M3.5 12.5h13M5 8.5h4.5c.8 0 1.5.7 1.5 1.5v2.5H3.5V10A1.5 1.5 0 0 1 5 8.5Zm6 4V10c0-.8.7-1.5 1.5-1.5H15c.8 0 1.5.7 1.5 1.5v2.5H11Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'guests') {
    return (
      <svg className={common} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M7.5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5.7-.4a2.4 2.4 0 1 0 0-4.8M2.8 17c.7-2.9 2.3-4.4 4.7-4.4s4 1.5 4.7 4.4M11.6 12.9c2 .3 3.2 1.7 3.7 4.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className={common} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M16.5 8.4c0 5-6.5 8.9-6.5 8.9S3.5 13.4 3.5 8.4a6.5 6.5 0 1 1 13 0Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 10.5a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function StaySearchRailCell({
  label,
  htmlFor,
  icon,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  icon: StaySearchIconName
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 transition-all focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100',
        className,
      )}
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700" aria-hidden="true">
        <StaySearchIcon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-500">
            {label}
          </label>
        ) : (
          <span className="block text-xs font-semibold text-gray-500">
            {label}
          </span>
        )}
        <div className="mt-0.5 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}

function formatAdults(count: number) {
  return `${count} ${count === 1 ? 'adult' : 'adults'}`
}

function formatRooms(count: number) {
  return `${count} ${count === 1 ? 'room' : 'rooms'}`
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-xs font-medium text-gray-500">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-night outline-none transition-colors hover:border-gray-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      >
        {options.map((option) => (
          <option key={`${id}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function StaySearchDestinationControl({
  island,
  city,
  islandOptions,
  cityOptions,
}: {
  island: string
  city: string
  islandOptions: string[]
  cityOptions: string[]
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [selectedIsland, setSelectedIsland] = useState(island)
  const [selectedCity, setSelectedCity] = useState(city)
  const summary = selectedCity && selectedIsland
    ? `${selectedCity}, ${selectedIsland}`
    : selectedCity || selectedIsland || 'All Bahamas'

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative min-w-0">
      <input type="hidden" name="island" value={selectedIsland} readOnly />
      <input type="hidden" name="city" value={selectedCity} readOnly />
      <button
        type="button"
        aria-label="Choose destination"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-none border-0 bg-transparent p-0 text-left text-sm font-medium text-night outline-none transition-colors focus:text-brand-700"
      >
        <span className="truncate">{summary}</span>
        <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-transform', open && 'rotate-180')} aria-hidden="true">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5 10 12l5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Destination"
          className="absolute left-0 z-[90] mt-3 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl shadow-gray-950/10 ring-1 ring-black/5"
        >
          <div className="grid gap-3">
            <SelectField
              id={`${id}-island`}
              label="Island"
              value={selectedIsland}
              onChange={(value) => {
                setSelectedIsland(value)
                setSelectedCity('')
              }}
              options={[
                { value: '', label: 'All Bahamas' },
                ...islandOptions.map((option) => ({ value: option, label: option })),
              ]}
            />
            <SelectField
              id={`${id}-city`}
              label="Area"
              value={selectedCity}
              onChange={setSelectedCity}
              options={[
                { value: '', label: 'All areas' },
                ...cityOptions.map((option) => ({ value: option, label: option })),
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium text-night">
        {label}
      </span>
      <div className="inline-flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-lg leading-none text-night transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
        >
          -
        </button>
        <span className="w-5 text-center text-sm font-semibold text-night">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-lg leading-none text-night transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function StaySearchDateRangeControl({
  checkin,
  checkout,
}: {
  checkin: string
  checkout: string
}) {
  const [start, setStart] = useState(checkin)
  const [end, setEnd] = useState(checkout)

  return (
    <div className="min-w-0">
      <input type="hidden" name="checkin" value={start} readOnly />
      <input type="hidden" name="checkout" value={end} readOnly />
      <BahaDateRangePicker
        start={start}
        end={end}
        onChange={(nextStart, nextEnd) => {
          setStart(nextStart)
          setEnd(nextEnd)
        }}
        placeholder="Add dates"
        showNights={false}
        showIcon={false}
        ariaLabel="Choose stay dates"
        className="min-w-0"
        triggerClassName={STAY_COMPACT_SEARCH_CONTROL_CLASS_NAME}
      />
    </div>
  )
}

export function StaySearchGuestRoomControl({
  adults,
  rooms,
}: {
  adults?: number
  rooms?: number
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [adultCount, setAdultCount] = useState(adults ?? 1)
  const [roomCount, setRoomCount] = useState(rooms ?? 1)
  const [hasAdults, setHasAdults] = useState(adults != null)
  const [hasRooms, setHasRooms] = useState(rooms != null)
  const active = hasAdults || hasRooms
  const summary = active
    ? [hasAdults ? formatAdults(adultCount) : null, hasRooms ? formatRooms(roomCount) : null].filter(Boolean).join(', ')
    : 'Add guests'

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative min-w-0">
      <input type="hidden" name="adults" value={hasAdults ? String(adultCount) : ''} readOnly />
      <input type="hidden" name="rooms" value={hasRooms ? String(roomCount) : ''} readOnly />
      <button
        id={`${id}-trigger`}
        type="button"
        aria-label="Choose travelers and rooms"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-none border-0 bg-transparent p-0 text-left text-sm font-medium text-night outline-none transition-colors focus:text-brand-700"
      >
        <span className="truncate">{summary}</span>
        <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-transform', open && 'rotate-180')} aria-hidden="true">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5 10 12l5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Travelers and rooms"
          className="absolute right-0 z-[90] mt-3 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl shadow-gray-950/10 ring-1 ring-black/5"
        >
          <Stepper
            label="Adults"
            value={adultCount}
            min={1}
            max={20}
            onChange={(value) => {
              setAdultCount(value)
              setHasAdults(true)
            }}
          />
          <div className="border-t border-gray-100" />
          <Stepper
            label="Rooms"
            value={roomCount}
            min={1}
            max={10}
            onChange={(value) => {
              setRoomCount(value)
              setHasRooms(true)
            }}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
