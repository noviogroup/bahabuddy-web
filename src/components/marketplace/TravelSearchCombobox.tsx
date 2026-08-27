'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { travelInputClassName } from '@/components/marketplace/TravelSearchFields'

export type TravelSearchComboboxOption = {
  value: string
  label: string
  code?: string
  description?: string
  keywords?: string[]
}

type TravelSearchComboboxProps = {
  id: string
  name?: string
  value: string
  options: TravelSearchComboboxOption[]
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  allowCustomValue?: boolean
  maxVisibleOptions?: number
  emptyLabel?: string
  helperText?: string
  customOptionLabel?: (query: string) => string
  variant?: 'marketplace' | 'dark'
  className?: string
}

type VisibleComboboxItem =
  | { kind: 'custom'; value: string }
  | { kind: 'option'; option: TravelSearchComboboxOption }

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function optionDisplay(option: TravelSearchComboboxOption): string {
  return option.code ? `${option.label} (${option.code})` : option.label
}

function optionSearchText(option: TravelSearchComboboxOption): string {
  return normalize([
    option.value,
    option.label,
    option.code,
    option.description,
    ...(option.keywords ?? []),
  ].filter(Boolean).join(' '))
}

function optionForValue(options: TravelSearchComboboxOption[], value: string): TravelSearchComboboxOption | undefined {
  const normalizedValue = normalize(value)
  return options.find((option) => (
    option.value === value
    || normalize(option.value) === normalizedValue
    || normalize(optionDisplay(option)) === normalizedValue
    || (option.code && normalize(option.code) === normalizedValue)
  ))
}

function filterOptions(options: TravelSearchComboboxOption[], query: string, limit: number): TravelSearchComboboxOption[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return options.slice(0, limit)

  const terms = normalizedQuery.split(' ').filter(Boolean)
  return options
    .filter((option) => {
      const text = optionSearchText(option)
      return terms.every((term) => text.includes(term))
    })
    .slice(0, limit)
}

function itemKey(item: VisibleComboboxItem) {
  return item.kind === 'custom'
    ? `custom-${item.value}`
    : `${item.option.value}-${item.option.code ?? item.option.label}`
}

export default function TravelSearchCombobox({
  id,
  name,
  value,
  options,
  onChange,
  placeholder = 'Search',
  ariaLabel,
  allowCustomValue = false,
  maxVisibleOptions = 8,
  emptyLabel = 'No matching airports',
  helperText = 'Search by city, airport, or code',
  customOptionLabel = (nextQuery) => `Use "${nextQuery}"`,
  variant = 'marketplace',
  className,
}: TravelSearchComboboxProps) {
  const generatedId = useId()
  const listboxId = `${id || generatedId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [activeIndex, setActiveIndex] = useState(0)

  const selectedOption = useMemo(() => optionForValue(options, value), [options, value])
  const displayValue = selectedOption ? optionDisplay(selectedOption) : value
  const visibleOptions = useMemo(
    () => filterOptions(options, query, maxVisibleOptions),
    [options, query, maxVisibleOptions],
  )
  const showCustomOption = allowCustomValue &&
    query.trim().length >= 2 &&
    !optionForValue(options, query) &&
    visibleOptions.length === 0
  const visibleItems = useMemo<VisibleComboboxItem[]>(
    () => [
      ...(showCustomOption ? [{ kind: 'custom' as const, value: query.trim() }] : []),
      ...visibleOptions.map((option) => ({ kind: 'option' as const, option })),
    ],
    [showCustomOption, query, visibleOptions],
  )
  const activeItem = visibleItems[activeIndex]
  const dark = variant === 'dark'

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setQuery(displayValue)
    }
  }, [displayValue])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        if (!allowCustomValue) setQuery(displayValue)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [allowCustomValue, displayValue])

  function chooseOption(option: TravelSearchComboboxOption) {
    onChange(option.value)
    setQuery(optionDisplay(option))
    setOpen(false)
    setActiveIndex(0)
  }

  function chooseCustom(nextValue: string) {
    const clean = nextValue.trim()
    if (!clean) return
    onChange(clean)
    setQuery(clean)
    setOpen(false)
    setActiveIndex(0)
  }

  function chooseItem(item: VisibleComboboxItem) {
    if (item.kind === 'custom') {
      chooseCustom(item.value)
      return
    }
    chooseOption(item.option)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value
    setQuery(nextQuery)
    setOpen(true)
    setActiveIndex(0)
    if (allowCustomValue) {
      const exactOption = optionForValue(options, nextQuery)
      onChange(exactOption?.value ?? nextQuery)
    } else {
      const exactOption = optionForValue(options, nextQuery)
      const matches = filterOptions(options, nextQuery, maxVisibleOptions)
      if (exactOption) {
        onChange(exactOption.value)
      } else if (matches.length === 1) {
        onChange(matches[0].value)
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => visibleItems.length === 0 ? 0 : Math.min(current + 1, visibleItems.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter' && open && activeItem) {
      event.preventDefault()
      chooseItem(activeItem)
      return
    }

    if (event.key === 'Enter' && allowCustomValue && query.trim()) {
      event.preventDefault()
      chooseCustom(query)
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
      if (!allowCustomValue) setQuery(displayValue)
    }
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (rootRef.current?.contains(document.activeElement)) return
      setOpen(false)
      if (!allowCustomValue) setQuery(displayValue)
    }, 100)
  }

  return (
    <div ref={rootRef} className={cx('relative overflow-visible', open && 'z-[80]')}>
      {name && <input type="hidden" name={name} value={value} />}
      <span
        className={cx(
          'pointer-events-none absolute left-2.5 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors',
          dark
            ? 'border border-white/15 bg-white/10 text-gold-300'
            : 'border border-gray-200 bg-brand-50 text-brand-700',
        )}
        aria-hidden="true"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
          <path d="m14.3 14.3 3.2 3.2M8.6 15.1a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeItem ? `${listboxId}-option-${activeIndex}` : undefined}
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          setQuery(displayValue)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        className={dark
          ? cx(
              'h-11 w-full rounded-xl border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white outline-none transition-all placeholder:text-white/45 hover:border-white/45 hover:bg-white/15 focus:border-white/70 focus:bg-white/15 focus:ring-4 focus:ring-white/10',
              'pl-12 pr-12',
              className,
            )
          : travelInputClassName(cx('pl-12 pr-12', className))
        }
      />
      <button
        type="button"
        aria-label="Show airport options"
        onClick={() => {
          setQuery(displayValue)
          setOpen((current) => !current)
          inputRef.current?.focus()
        }}
        className={cx(
          'absolute right-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2',
          dark
            ? 'border-white/15 bg-white/10 text-white/80 hover:bg-white/15 hover:text-white focus-visible:ring-white/20'
            : 'border-gray-200 bg-white text-brand-700 shadow-sm hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-brand-200',
        )}
      >
        <svg className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 7.5 10 12l5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={cx(
            'absolute left-0 z-[90] mt-2 min-w-full overflow-hidden rounded-[1.35rem] shadow-2xl sm:min-w-[24rem]',
            dark
              ? 'border border-white/20 bg-night/95 shadow-black/40 ring-1 ring-white/10 backdrop-blur-xl'
              : 'border border-gray-200 bg-white shadow-gray-950/10 ring-1 ring-black/5',
          )}
        >
          <div className={cx(
            'flex items-start justify-between gap-4 border-b px-4 py-3',
            dark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50/80',
          )}>
            <div className="min-w-0">
              <p className={cx(
                'text-xs font-semibold uppercase',
                dark ? 'text-white/60' : 'text-gray-500',
              )}>
                Airport search
              </p>
              <p className={cx(
                'mt-1 text-xs font-semibold leading-5',
                dark ? 'text-white/65' : 'text-gray-500',
              )}>
                {helperText}
              </p>
            </div>
            <span className={cx(
              'hidden shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase sm:inline-flex',
              dark ? 'border-white/15 bg-white/10 text-white/65' : 'border-gray-200 bg-white text-gray-500',
            )}>
              Type to filter
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {visibleItems.length > 0 ? (
              visibleItems.map((item, index) => {
              if (item.kind === 'custom') {
                const active = index === activeIndex
                return (
                  <button
                    key={itemKey(item)}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      chooseCustom(item.value)
                    }}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors',
                      dark
                        ? active ? 'bg-white/12' : 'hover:bg-white/10'
                        : active ? 'bg-brand-50' : 'bg-white hover:bg-gray-50',
                    )}
                  >
                    <span className={cx(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                      dark ? 'border-white/20 bg-white/10 text-gold-300' : 'border-gray-200 bg-white text-brand-700',
                    )}>
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M10 18s5.5-4.6 5.5-10A5.5 5.5 0 0 0 4.5 8c0 5.4 5.5 10 5.5 10Z" stroke="currentColor" strokeWidth="1.7" />
                        <path d="M10 10.2A2.2 2.2 0 1 0 10 5.8a2.2 2.2 0 0 0 0 4.4Z" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx(
                        'block truncate text-sm font-semibold',
                        dark ? 'text-white' : 'text-night',
                      )}>
                        {customOptionLabel(item.value)}
                      </span>
                      <span className={cx(
                        'mt-0.5 block text-xs font-semibold',
                        dark ? 'text-white/60' : 'text-gray-500',
                      )}>
                        We will resolve the closest airport during live search.
                      </span>
                    </span>
                  </button>
                )
              }

              const option = item.option
              const active = index === activeIndex
              const selected = option.value === value
              return (
                <button
                  key={itemKey(item)}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    chooseOption(option)
                  }}
                  className={cx(
                    'flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors',
                    dark
                      ? active ? 'bg-white/12' : 'hover:bg-white/10'
                      : active ? 'bg-brand-50' : 'bg-white hover:bg-gray-50',
                  )}
                >
                  <span className={cx(
                    'mt-0.5 inline-flex min-w-12 justify-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm',
                    selected
                      ? dark
                        ? 'border-white/25 bg-white text-night'
                        : 'border-gold-300 bg-gold-400 text-night'
                      : dark
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'border-gray-200 bg-white text-brand-700',
                  )}>
                    {option.code ?? option.value}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx(
                      'block truncate text-sm font-semibold',
                      dark ? 'text-white' : 'text-night',
                    )}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span className={cx(
                        'mt-0.5 block text-xs font-semibold leading-4',
                        dark ? 'text-white/60' : 'text-gray-500',
                      )}>
                        {option.description}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <span
                      className={cx(
                        'mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                        dark ? 'bg-gold-300 text-night' : 'bg-gold-400 text-night',
                      )}
                      aria-hidden="true"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                        <path d="m3.5 8.2 2.8 2.8 6.2-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              )
              })
            ) : (
              <div className={cx(
                'rounded-xl px-3 py-3 text-sm font-semibold',
                dark ? 'text-white/60' : 'text-gray-500',
              )}>
                {emptyLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
