import Link from 'next/link'
import Footer from '@/components/Footer'
import PortableTextBody from '@/components/PortableTextBody'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import type {SanityContentPage, SanityContentPageAction} from '@/lib/sanity/types'

function ManagedAction({action}: {action: SanityContentPageAction}) {
  const className = action.style === 'primary'
    ? 'inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700'
    : 'inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night hover:bg-gray-50'

  if (action.href.startsWith('http') || action.href.startsWith('mailto:')) {
    return <a href={action.href} target={action.openInNewTab ? '_blank' : undefined} rel={action.openInNewTab ? 'noopener noreferrer' : undefined} className={className}>{action.label}</a>
  }
  return <Link href={action.href} className={className}>{action.label}</Link>
}

export default function SanityManagedContentPage({page}: {page: SanityContentPage}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CompactPageHeader
        eyebrow={page.eyebrow ?? 'Baha Buddy'}
        title={page.title}
        subtitle={page.subtitle ?? undefined}
        crumbs={[{href: '/', label: 'Home'}, {label: page.title}]}
        actions={page.heroActions.length ? <>{page.heroActions.map((action) => <ManagedAction key={`${action.href}-${action.label}`} action={action} />)}</> : undefined}
      />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {page.effectiveDate && <p className="text-sm font-semibold text-gray-500">Effective date: {page.effectiveDate}</p>}
        {page.sections.map((section) => (
          <section key={section._key} id={section.anchor ?? undefined} className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            {section.eyebrow && <p className="text-xs font-semibold uppercase text-brand-700">{section.eyebrow}</p>}
            <h2 className="mt-1 text-2xl font-bold text-night">{section.heading}</h2>
            {section.body?.length ? <div className="mt-4"><PortableTextBody body={section.body} /></div> : null}
            {section.items.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {section.items.map((item) => <article key={item._key} className="rounded-2xl border border-gray-200 p-4"><h3 className="font-bold text-night">{item.icon ? `${item.icon} ` : ''}{item.title}</h3>{item.description && <p className="mt-2 text-sm leading-6 text-charcoal">{item.description}</p>}</article>)}
              </div>
            ) : null}
            {section.actions.length ? <div className="mt-5 flex flex-wrap gap-3">{section.actions.map((action) => <ManagedAction key={`${action.href}-${action.label}`} action={action} />)}</div> : null}
          </section>
        ))}
      </main>
      <Footer />
    </div>
  )
}
