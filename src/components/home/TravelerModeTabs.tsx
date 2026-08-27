'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { BuddyAvatar } from '@/components/ui'
import { BahaImages } from '@/lib/baha-images'

type TravelerModeKey = 'planning' | 'here' | 'cruise'
type VisualStepIcon = 'island' | 'stay' | 'flight' | 'nearby' | 'food' | 'beach' | 'dock' | 'nassau' | 'return'

interface TravelerMode {
  key: TravelerModeKey
  label: string
  eyebrow: string
  title: string
  image: string
  imageAlt: string
  imagePosition: string
  primaryLabel: string
  primaryHref: string
  supportingLinks: Array<{
    label: string
    href: string
  }>
}

function travelerModeTripHref(seed: string): string {
  const params = new URLSearchParams()
  params.set('returnTo', '/')
  params.set('source', 'homepage_traveler_mode')
  params.set('seed', seed.replace(/\s+/g, ' ').trim().slice(0, 600))
  return `/dashboard/trips/new?${params.toString()}`
}

function StepIcon({ icon }: { icon: VisualStepIcon }) {
  switch (icon) {
    case 'island':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 18c2.5-1.2 5-1.2 7.5 0s5 1.2 8.5 0" />
          <path d="M10.5 16c.8-3.7 1.3-7.1 1-10.5" />
          <path d="M11.4 6.2c-2.6-.7-4.5 0-5.9 2.1 2.4.1 4.2-.5 5.9-2.1Z" />
          <path d="M11.6 5.8c2.3-1.4 4.4-1.3 6.4.3-2.1.7-4.1.6-6.4-.3Z" />
          <path d="M12.3 7c2.3.5 3.8 1.8 4.4 3.9-2-.1-3.5-1.4-4.4-3.9Z" />
        </svg>
      )
    case 'stay':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 11V7" />
          <path d="M4 18v-7" />
          <path d="M20 18v-5.5a3 3 0 0 0-3-3H9.5A3.5 3.5 0 0 0 6 13" />
          <path d="M4 13h16" />
          <path d="M4 18h16" />
          <path d="M7 9.5h2.5" />
        </svg>
      )
    case 'flight':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 16.5 21 6.5" />
          <path d="m8 13.5-3.5-6 2.3-1.1 5.4 4.8" />
          <path d="m13.4 10.7 3.3-7.1 2.5-1.1-.9 9.7" />
          <path d="m12.2 17.2 1.5 3.2 2.1-1 1.2-5" />
        </svg>
      )
    case 'nearby':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s6-5.1 6-11a6 6 0 0 0-12 0c0 5.9 6 11 6 11Z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      )
    case 'food':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 3v7" />
          <path d="M5 3v7" />
          <path d="M9 3v7" />
          <path d="M5 10h4" />
          <path d="M7 10v11" />
          <path d="M16.5 3c1.7 1.7 2.5 3.7 2.5 6v12" />
          <path d="M14.5 12h4.5" />
        </svg>
      )
    case 'beach':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 11c3.2-4 8.3-5.2 14.5-3.4" />
          <path d="M18.5 7.6c-2.4.1-4.4 1.2-6 3.4" />
          <path d="M12.5 11 9 21" />
          <path d="M4 20c2.4-1.1 4.9-1.1 7.3 0s4.8 1.1 7.2 0" />
        </svg>
      )
    case 'dock':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 18h14" />
          <path d="M7 14h10l-1.6 4H8.6L7 14Z" />
          <path d="M9 14V8h6v6" />
          <path d="M10.5 8V5h3V8" />
          <path d="M4 21c2.2-1 4.4-1 6.6 0s4.4 1 6.6 0 3.1-.9 4.8 0" />
        </svg>
      )
    case 'nassau':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h16" />
          <path d="M5.5 10.5 12 5l6.5 5.5" />
          <path d="M7 10.5h10V20H7z" />
          <path d="M9.5 20v-5h5v5" />
          <path d="M9.5 13h5" />
        </svg>
      )
    case 'return':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 8H5V4" />
          <path d="M5.4 8A7.5 7.5 0 1 1 4.8 14" />
          <path d="M12 8v4.5l3 1.8" />
        </svg>
      )
  }
}

function WidgetIcon({ icon }: { icon: VisualStepIcon }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/45 text-brand-700 ring-1 ring-white/55 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
      <StepIcon icon={icon} />
    </span>
  )
}

function ProductCard({
  icon,
  label,
  title,
  detail,
}: {
  icon: VisualStepIcon
  label: string
  title: string
  detail: string
}) {
  return (
    <div className="min-w-0 rounded-baha-md border border-white/45 bg-white/42 px-2.5 py-2 shadow-sm backdrop-blur-md">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <WidgetIcon icon={icon} />
          <p className="min-w-0 truncate text-xs font-black uppercase text-brand-600">{label}</p>
        </div>
        <p className="mt-1 truncate text-xs font-bold leading-tight text-night">{title}</p>
        <p className="mt-0.5 truncate text-xs font-semibold leading-tight text-charcoal">{detail}</p>
      </div>
    </div>
  )
}

function PlanningWidget() {
  return (
    <div className="w-full max-w-[21.5rem] rounded-baha-xl border border-white/45 bg-white/44 p-3 shadow-soft backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3 border-b border-white/45 pb-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <BuddyAvatar size="sm" state="presenting" className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-brand-600">Trip draft</p>
            <p className="truncate text-sm font-bold text-night">Island, stay, flight matched</p>
          </div>
        </div>
        <span className="rounded-full bg-white/55 px-2.5 py-1 text-xs font-black uppercase text-gold-700">
          Ready
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <ProductCard icon="island" label="Island" title="Exuma fit" detail="Blue water + boat day" />
        <ProductCard icon="stay" label="Stay" title="Beach resort" detail="5 nights saved" />
        <ProductCard icon="flight" label="Flight" title="NAS route" detail="Fare check open" />
      </div>
    </div>
  )
}

function AlreadyHereWidget() {
  return (
    <div className="w-full max-w-[21.5rem] rounded-baha-xl border border-white/45 bg-white/44 p-3 shadow-soft backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3 border-b border-white/45 pb-2.5">
        <div>
          <p className="text-xs font-black uppercase text-brand-600">Nearby now</p>
          <p className="mt-1 text-sm font-bold text-night">Open places around you</p>
        </div>
        <div className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-black uppercase text-white shadow-soft">
          Live
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <ProductCard icon="nearby" label="Walk" title="10 min beach stop" detail="Good for the next hour" />
        <ProductCard icon="food" label="Food" title="Local lunch nearby" detail="Open now, casual" />
        <ProductCard icon="beach" label="Next" title="Shade + swim option" detail="Low-friction detour" />
      </div>
    </div>
  )
}

function CruiseWidget() {
  return (
    <div className="w-full max-w-[21.5rem] rounded-baha-xl border border-white/45 bg-white/44 p-3 shadow-soft backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3 border-b border-white/45 pb-2.5">
        <div>
          <p className="text-xs font-black uppercase text-brand-600">Port-day route</p>
          <p className="mt-1 text-sm font-bold text-night">Built around return time</p>
        </div>
        <div className="rounded-full bg-white/55 px-3 py-1.5 text-xs font-black uppercase text-gold-700">
          Buffer
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {[
          { icon: 'dock' as const, label: 'Dock', title: 'Ship arrival', detail: 'Start near port' },
          { icon: 'nassau' as const, label: 'Explore', title: 'Nassau route', detail: 'Food + culture loop' },
          { icon: 'return' as const, label: 'Return', title: 'Back with time', detail: 'Return window protected' },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <ProductCard {...item} />
          </div>
        ))}
      </div>
    </div>
  )
}

function TravelerModeVisual({ mode }: { mode: TravelerMode }) {
  const widget =
    mode.key === 'planning' ? <PlanningWidget />
      : mode.key === 'here' ? <AlreadyHereWidget />
        : <CruiseWidget />

  return (
    <div className="relative min-h-[21rem] overflow-hidden bg-brand-50 sm:min-h-[24rem] lg:min-h-[24rem]">
      <Image
        src={mode.image}
        alt={mode.imageAlt}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 620px"
        style={{ objectPosition: mode.imagePosition }}
      />
      <div className="absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-5" aria-hidden="true">
        {widget}
      </div>
    </div>
  )
}

const TRAVELER_MODES: TravelerMode[] = [
  {
    key: 'planning',
    label: 'Planning a trip',
    eyebrow: 'Before you fly',
    title: 'Pick the right island first.',
    image: BahaImages.travelerPlanning,
    imageAlt: 'Traveler planning a Bahamas trip on a quiet beach',
    imagePosition: 'center 50%',
    primaryLabel: 'Start a trip',
    primaryHref: travelerModeTripHref('Plan a Bahamas trip with island fit, stays, flights, activities, food, transport, and backup timing.'),
    supportingLinks: [
      { label: 'Compare islands', href: '/destinations' },
      { label: 'Search flights', href: '/flights' },
    ],
  },
  {
    key: 'here',
    label: 'Already here',
    eyebrow: 'In The Bahamas',
    title: 'Find what works today.',
    image: BahaImages.travelerHere,
    imageAlt: 'Traveler walking Nassau waterfront near pastel buildings',
    imagePosition: 'center 50%',
    primaryLabel: 'Explore nearby',
    primaryHref: '/explore?mode=already-here',
    supportingLinks: [
      { label: 'Find restaurants', href: '/restaurants' },
      { label: 'Things to do', href: '/explore' },
    ],
  },
  {
    key: 'cruise',
    label: 'On a cruise',
    eyebrow: 'Port day',
    title: 'Dock. Explore. Return on time.',
    image: BahaImages.travelerCruise,
    imageAlt: 'Travelers walking from Nassau cruise port toward local shops',
    imagePosition: 'center 50%',
    primaryLabel: 'Plan day',
    primaryHref: '/nassau-cruise-day-planner',
    supportingLinks: [
      { label: 'View routes', href: '/nassau-cruise-itineraries' },
      { label: 'Find food', href: '/restaurants' },
    ],
  },
]

export default function TravelerModeTabs() {
  const [activeKey, setActiveKey] = useState<TravelerModeKey>('planning')
  const activeMode = TRAVELER_MODES.find((mode) => mode.key === activeKey) ?? TRAVELER_MODES[0]

  return (
    <section className="border-b border-brand-100 bg-offwhite py-14 sm:py-16" aria-labelledby="traveler-mode-title">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-brand-700">Start from your moment</p>
            <h2 id="traveler-mode-title" className="mt-3 text-2xl font-bold leading-tight text-night ">
              What kind of Bahamas help do you need?
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Traveler status"
            className="flex gap-2 overflow-x-auto rounded-full border border-brand-100 bg-white p-1 shadow-soft"
          >
            {TRAVELER_MODES.map((mode) => {
              const selected = mode.key === activeMode.key

              return (
                <button
                  key={mode.key}
                  id={`traveler-mode-tab-${mode.key}`}
                  type="button"
                  role="tab"
                  aria-label={mode.label}
                  aria-selected={selected}
                  aria-controls={`traveler-mode-panel-${mode.key}`}
                  className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:flex-1 ${
                    selected
                      ? 'bg-brand-600 text-white shadow-soft'
                      : 'bg-white text-brand-800 hover:bg-brand-50'
                  }`}
                  onClick={() => setActiveKey(mode.key)}
                >
                  {mode.label}
                </button>
              )
            })}
          </div>
        </div>

        <div
          id={`traveler-mode-panel-${activeMode.key}`}
          role="tabpanel"
          aria-labelledby={`traveler-mode-tab-${activeMode.key}`}
          className="mt-8 grid overflow-hidden rounded-baha-xl border border-brand-100 bg-white shadow-card lg:min-h-[24rem] lg:grid-cols-[1.12fr_0.88fr]"
        >
          <TravelerModeVisual mode={activeMode} />

          <div className="flex flex-col justify-center p-5 sm:p-8">
            <p className="text-xs font-black uppercase text-brand-700">{activeMode.eyebrow}</p>
            <h3 className="mt-3 max-w-xl text-3xl font-bold leading-tight text-night">{activeMode.title}</h3>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={activeMode.primaryHref}
                className="inline-flex min-h-11 w-fit items-center justify-center whitespace-nowrap rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-soft hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                {activeMode.primaryLabel}
              </Link>
              {activeMode.supportingLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
