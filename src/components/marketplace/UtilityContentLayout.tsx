import Link from 'next/link'
import type { ReactNode } from 'react'
import Footer from '@/components/Footer'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

export const utilityNav = [
  { href: '/about', label: 'About Baha Buddy' },
  { href: '/how-it-works', label: 'How Baha Buddy works' },
  { href: '/help', label: 'Help center' },
  { href: '/contact', label: 'Contact us' },
  { href: '/accessibility', label: 'Accessibility' },
  { href: '/partners', label: 'Partner with us' },
  { href: '/tourism-board-partnerships', label: 'Tourism board partnerships' },
  { href: '/list-your-property', label: 'List your property' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
]

type UtilityContentLayoutProps = {
  activePath: string
  title: string
  subtitle?: string
  eyebrow?: string
  effectiveDate?: string
  children: ReactNode
}

export default function UtilityContentLayout({
  activePath,
  title,
  subtitle,
  eyebrow = 'Baha Buddy',
  effectiveDate,
  children,
}: UtilityContentLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CompactPageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        crumbs={[
          { href: '/', label: 'Home' },
          { label: title },
        ]}
      />

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <nav aria-label="Company and legal pages" className="rounded-baha-lg border border-gray-200 bg-white p-2 shadow-sm">
            {utilityNav.map((item) => {
              const active = item.href === activePath
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-baha-md px-4 py-3 text-sm font-bold transition-colors ${
                    active
                      ? 'bg-gray-100 text-night'
                      : 'text-charcoal hover:bg-gray-50 hover:text-night'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <article className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          {effectiveDate && (
            <p className="mb-6 text-sm font-semibold text-gray-500">
              Effective date: {effectiveDate}
            </p>
          )}
          <div className="max-w-none space-y-7 text-charcoal [&_a]:font-semibold [&_a]:text-night [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-night [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-night [&_li]:leading-7 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:leading-7 [&_p]:text-charcoal [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}
