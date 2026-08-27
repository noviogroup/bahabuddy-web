import Link from 'next/link'
import type { ReactNode } from 'react'

export type ActiveFilter = {
  label: string
  value: string
  href: string
}

export type FilterSummaryItem = {
  label: string
  value: string
  detail?: string
}

export function FilterChip({
  href,
  active,
  children,
  tone = 'brand',
}: {
  href: string
  active: boolean
  children: ReactNode
  tone?: 'brand' | 'gold' | 'neutral'
}) {
  const accentClass = tone === 'neutral' ? 'bg-gray-400' : tone === 'gold' ? 'bg-gold-400' : 'bg-gold-400'
  const activeClass = 'border-gray-900 bg-white text-night ring-2 ring-gray-100'

  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 ${
        active
          ? activeClass
          : 'border-gray-200 bg-white text-charcoal hover:border-gray-300 hover:bg-gray-50 hover:text-night'
      }`}
    >
      {active && (
        <span className={`h-1.5 w-1.5 rounded-full ${accentClass}`} aria-hidden="true" />
      )}
      {children}
    </Link>
  )
}

export function FilterButton({
  active,
  children,
  onClick,
  tone = 'brand',
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
  tone?: 'brand' | 'gold' | 'neutral'
}) {
  const accentClass = tone === 'neutral' ? 'bg-gray-400' : tone === 'gold' ? 'bg-gold-400' : 'bg-gold-400'
  const activeClass = 'border-gray-900 bg-white text-night ring-2 ring-gray-100'

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 ${
        active
          ? activeClass
          : 'border-gray-200 bg-white text-charcoal hover:border-gray-300 hover:bg-gray-50 hover:text-night'
      }`}
    >
      {active && (
        <span className={`h-1.5 w-1.5 rounded-full ${accentClass}`} aria-hidden="true" />
      )}
      {children}
    </button>
  )
}

export function FilterGroup({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase text-night">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs font-medium text-gray-500">
            {description}
          </p>
        )}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  )
}

export function ResultFilterPanel({
  ariaLabel,
  eyebrow,
  title,
  description,
  summaryItems = [],
  activeFilters,
  clearHref,
  emptyLabel,
  mobileSummary = 'Filter and sort',
  desktopGridClassName = 'md:grid-cols-2 lg:grid-cols-[1.3fr_1fr]',
  children,
}: {
  ariaLabel: string
  eyebrow: string
  title: string
  description?: string
  summaryItems?: FilterSummaryItem[]
  activeFilters: ActiveFilter[]
  clearHref: string
  emptyLabel: string
  mobileSummary?: string
  desktopGridClassName?: string
  children: ReactNode
}) {
  return (
    <section
      aria-label={ariaLabel}
      className="mb-8 overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:py-4">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-bold text-night">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
        {activeFilters.length > 0 ? (
          <Link
            href={clearHref}
            className="inline-flex w-fit items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Clear all filters
          </Link>
        ) : (
          <span className="inline-flex w-fit rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-500 ring-1 ring-gray-200">
            {emptyLabel}
          </span>
        )}
      </div>

      {summaryItems.length > 0 && (
        <div className="grid gap-2 border-b border-gray-100 bg-white px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-baha-md border border-gray-200 bg-white px-3 py-2"
            >
              <p className="text-xs font-medium uppercase text-gray-400">
                {item.label}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-night">
                {item.value}
              </p>
              {item.detail && (
                <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">
                  {item.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
          <span className="text-xs font-medium uppercase text-gray-400">
            Active
          </span>
          {activeFilters.map((filter) => (
            <Link
              key={`${filter.label}-${filter.value}`}
              href={filter.href}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-charcoal ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-night focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              title={`Remove ${filter.label} filter`}
            >
              <span className="text-gray-400">{filter.label}:</span>
              <span>{filter.value}</span>
              <span aria-hidden="true" className="text-gray-500">Remove</span>
            </Link>
          ))}
        </div>
      )}

      <details className="group md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-night marker:hidden">
          <span>{mobileSummary}</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-charcoal ring-1 ring-gray-200">
            {activeFilters.length > 0 ? `${activeFilters.length} active` : 'Open'}
          </span>
        </summary>
        <div className="grid gap-5 border-t border-gray-100 p-4">
          {children}
        </div>
      </details>

      <div className={`hidden gap-5 p-4 md:grid ${desktopGridClassName}`}>
        {children}
      </div>
    </section>
  )
}
