'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/** Keep search context visible and form values mounted while comparing results. */
export default function SearchSummaryPanel({
  summary,
  detail,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
}: {
  summary: string
  detail: string
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const id = useId()
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const expanded = open ?? internalOpen
  const toggleRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded && contentRef.current?.contains(document.activeElement)) {
      toggleRef.current?.focus()
    }
  }, [expanded])

  function changeOpen(value: boolean) {
    setInternalOpen(value)
    onOpenChange?.(value)
  }

  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white" aria-label="Search details">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
        <div className="min-w-0">
          <p className="font-semibold text-night">{summary}</p>
          <p className="mt-1 text-sm text-gray-600">{detail}</p>
        </div>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => changeOpen(!expanded)}
          className="inline-flex min-h-11 items-center rounded-full border border-gray-200 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          {expanded ? 'Close search' : 'Edit search'}
        </button>
      </div>
      <div
        ref={contentRef}
        id={id}
        hidden={!expanded}
        className="border-t border-gray-100 p-4 sm:p-5"
        onKeyDown={(event) => {
          // Let open date/airport popovers handle Escape before the parent.
          if (event.key === 'Escape' && !event.defaultPrevented &&
              !event.currentTarget.querySelector('[role="dialog"], [role="listbox"]')) {
            changeOpen(false)
            toggleRef.current?.focus()
          }
        }}
      >
        {children}
      </div>
    </section>
  )
}
