import Link from 'next/link'
import type { ReactNode } from 'react'

type Crumb = {
  href?: string
  label: string
}

type CompactPageHeaderProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  crumbs?: Crumb[]
  actions?: ReactNode
  children?: ReactNode
}

export default function CompactPageHeader({
  eyebrow,
  title,
  subtitle,
  crumbs,
  actions,
  children,
}: CompactPageHeaderProps) {
  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
                {index > 0 && <span className="text-gray-300">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="inline-flex min-h-11 items-center rounded-lg pr-1 hover:text-night focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-night">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            {eyebrow && (
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                {eyebrow}
              </p>
            )}
            <h1 className="text-[1.75rem] font-bold leading-tight text-night sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex w-full flex-wrap gap-2 md:w-auto [&>*]:min-h-11 [&>*]:flex-1 [&>*]:items-center [&>*]:justify-center md:[&>*]:flex-none">{actions}</div>}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </section>
  )
}
