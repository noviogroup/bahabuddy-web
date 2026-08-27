'use client'

import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  ChangeEvent,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function travelInputClassName(className?: string) {
  return cx(
    'h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-night outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-500 focus:bg-white focus:ring-4 focus:ring-gray-100',
    className,
  )
}

export function travelSelectClassName(className?: string) {
  return cx(
    'h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-night outline-none transition-all hover:border-gray-300 focus:border-gray-500 focus:bg-white focus:ring-4 focus:ring-gray-100',
    className,
  )
}

type TravelSearchFieldContextValue = {
  label?: string
}

const TravelSearchFieldContext = createContext<TravelSearchFieldContextValue>({})

type ParsedSelectOption = {
  value: string
  label: string
  disabled: boolean
}

function optionText(value: ReactNode): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(optionText).join('')
  if (isValidElement(value)) return optionText(value.props.children)
  return ''
}

function parseSelectOptions(children: ReactNode): ParsedSelectOption[] {
  return Children.toArray(children).flatMap((child): ParsedSelectOption[] => {
    if (!isValidElement(child)) return []
    if (child.type === 'option') {
      const option = child as ReactElement<{
        value?: string | number
        disabled?: boolean
        children?: ReactNode
      }>
      const label = optionText(option.props.children).trim()
      return [{
        value: String(option.props.value ?? label),
        label,
        disabled: option.props.disabled === true,
      }]
    }
    if (child.type === 'optgroup') {
      return parseSelectOptions((child as ReactElement<{ children?: ReactNode }>).props.children)
    }
    return []
  })
}

export function travelTextareaClassName(className?: string) {
  return cx(
    'min-h-32 w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-night outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-500 focus:bg-white focus:ring-4 focus:ring-gray-100',
    className,
  )
}

export function TravelSearchField({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={cx('rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm', className)}>
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <label htmlFor={htmlFor} className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-brand-700">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
          {label}
        </label>
        {hint && (
          <span className="truncate text-xs font-medium text-gray-400">
            {hint}
          </span>
        )}
      </div>
      <TravelSearchFieldContext.Provider value={{ label }}>
        {children}
      </TravelSearchFieldContext.Provider>
    </div>
  )
}

export const TravelSearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TravelSearchInput(props, ref) {
  const { className, ...rest } = props
  return <input ref={ref} {...rest} className={travelInputClassName(className)} />
})

export const TravelSearchSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function TravelSearchSelect(props, ref) {
  const {
    className,
    children,
    value,
    defaultValue,
    onChange,
    disabled,
    id,
    name,
    required,
    ...rest
  } = props
  const field = useContext(TravelSearchFieldContext)
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const listboxId = `${triggerId}-listbox`
  const nativeSelectId = `${triggerId}-native`
  const rootRef = useRef<HTMLDivElement>(null)
  const nativeSelectRef = useRef<HTMLSelectElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [internalValue, setInternalValue] = useState<string>(() => String(value ?? defaultValue ?? ''))
  const options = useMemo(() => parseSelectOptions(children), [children])
  const selectedValue = String(value ?? internalValue ?? options[0]?.value ?? '')
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue))
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0]
  const activeOption = options[activeIndex] ?? selectedOption
  const visualLabel = props['aria-label'] ?? field.label ?? name ?? 'Select option'

  useImperativeHandle(ref, () => nativeSelectRef.current as HTMLSelectElement)

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(String(value))
    }
  }, [value])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function emitChange(nextValue: string) {
    if (!nativeSelectRef.current) return
    nativeSelectRef.current.value = nextValue
    onChange?.({
      target: nativeSelectRef.current,
      currentTarget: nativeSelectRef.current,
    } as ChangeEvent<HTMLSelectElement>)
  }

  function chooseOption(option: ParsedSelectOption) {
    if (option.disabled || disabled) return
    if (value === undefined) {
      setInternalValue(option.value)
    }
    emitChange(option.value)
    setOpen(false)
  }

  function handleNativeChange(event: ChangeEvent<HTMLSelectElement>) {
    setInternalValue(event.target.value)
    onChange?.(event)
  }

  function handleTriggerClick() {
    if (disabled) return
    setActiveIndex(selectedIndex)
    setOpen((current) => !current)
  }

  function redirectNativeFocusToTrigger() {
    if (disabled) return
    setActiveIndex(selectedIndex)
    setOpen(true)
    window.requestAnimationFrame(() => triggerButtonRef.current?.focus())
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.min(current + 1, options.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(Math.max(0, options.length - 1))
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && open && activeOption) {
      event.preventDefault()
      chooseOption(activeOption)
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && !open) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(selectedIndex)
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cx('relative overflow-visible', open && 'z-[80]')}>
      <select
        {...rest}
        ref={nativeSelectRef}
        id={triggerId}
        name={name}
        required={required}
        disabled={disabled}
        value={selectedValue}
        onChange={handleNativeChange}
        onFocus={redirectNativeFocusToTrigger}
        onInvalid={(event) => {
          event.preventDefault()
          redirectNativeFocusToTrigger()
        }}
        className="sr-only"
        tabIndex={-1}
      >
        {children}
      </select>

      <button
        ref={triggerButtonRef}
        id={nativeSelectId}
        type="button"
        disabled={disabled}
        aria-label={`Open ${visualLabel} menu`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        className={travelSelectClassName(cx(
          'flex items-center justify-between gap-2 pl-3 pr-2 text-left disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-400',
          open && 'border-gray-500 ring-4 ring-gray-100',
          className,
        ))}
      >
        <span className="min-w-0 truncate">
          {selectedOption?.label || 'Select'}
        </span>
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm" aria-hidden="true">
          <svg className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5 10 12l5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 z-[90] mt-2 min-w-full overflow-hidden rounded-[1.25rem] border border-gray-200 bg-white shadow-2xl shadow-gray-950/10 ring-1 ring-black/5 sm:min-w-[16rem]"
        >
          <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-gray-500">
              {visualLabel ? `Choose ${visualLabel}` : 'Choose option'}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
              Use the list below. Keyboard arrows and Enter are supported.
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {options.map((option, index) => {
              const active = index === activeIndex
              const selected = option.value === selectedValue
              return (
                <button
                  key={`${option.value}-${index}`}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    chooseOption(option)
                  }}
                  className={cx(
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors',
                    active ? 'bg-brand-50 text-night' : 'bg-white text-charcoal hover:bg-gray-50 hover:text-night',
                    option.disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected && (
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400 text-night" aria-hidden="true">
                      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                        <path d="m3.5 8.2 2.8 2.8 6.2-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

export const TravelSearchTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TravelSearchTextarea(props, ref) {
  const { className, ...rest } = props
  return <textarea ref={ref} {...rest} className={travelTextareaClassName(className)} />
})
