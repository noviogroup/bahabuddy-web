import Link from 'next/link'
import { buddyChatHref } from '@/lib/buddy-chat'

/**
 * PlanWithBuddyCTA — the shared Buddy support panel at the bottom of
 * detail pages.
 *
 * The detail page is the content layer; this CTA keeps Buddy available
 * for contextual questions and planning advice. Concrete save, add, or
 * booking actions belong on the detail page itself via direct controls.
 *
 * It carries two conversational affordances:
 *
 *   1. "Ask Buddy about this" - opens chat with a question prompt
 *      so the user can dig deeper conversationally
 *   2. A contextual planning prompt that asks Buddy to compare, fit,
 *      or plan around the item without mutating a trip
 *
 * Copy varies by `kind`. Stay = hotels. Experience = activities &
 * articles. Meal = restaurants.
 */

export type CTAKind = 'stay' | 'experience' | 'meal'

interface PlanWithBuddyCTAProps {
  /** Prompt for the "Ask Buddy about this" contextual CTA. */
  planPrompt: string
  /** Secondary Buddy planning prompt. It must not request direct save/add/book. */
  addPrompt: string
  /** Optional secondary label when the action is planning, not direct save. */
  secondaryLabel?: string
  /** Kind drives the copy tone. */
  kind: CTAKind
}

export function PlanWithBuddyCTA({ planPrompt, addPrompt, secondaryLabel = 'Plan around this', kind }: PlanWithBuddyCTAProps) {
  const headline =
    kind === 'stay'      ? 'Make it part of your trip'
    : kind === 'meal'    ? 'Fit it into your day'
    :                      'Plan this experience'

  const sub =
    kind === 'stay'      ? "Buddy can pair this stay with flights, activities nearby, and a full day-by-day plan."
    : kind === 'meal'    ? "Buddy can fit this meal into your day plan and suggest what to do on either side of it."
    :                      "Buddy can build a half-day or full-day around it, with timing, transport, and what else fits nearby."

  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-2 text-xs font-bold uppercase text-gray-500">
        Plan with Buddy
      </p>
      <h2 className="mb-3 text-xl font-bold text-night">
        {headline}
      </h2>
      <p className="mb-5 max-w-lg text-sm leading-relaxed text-charcoal">
        {sub}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={buddyChatHref(planPrompt)}
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-5 py-2.5 text-sm font-bold text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2"
        >
          Ask Buddy about this
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
        <Link
          href={buddyChatHref(toBuddyPlanningPrompt(addPrompt), { start: 1 })}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
        >
          {secondaryLabel}
        </Link>
      </div>
    </section>
  )
}

function toBuddyPlanningPrompt(prompt: string): string {
  const clean = prompt.trim()
  const withoutMutationVerb = clean
    .replace(/^(add|save)\s+/i, 'Help me plan around ')
    .replace(/^book\s+/i, 'Help me understand booking options for ')
    .replace(/\s+to my(?: Bahamas)?(?: trip| dining)? plan\.?$/i, '')
    .replace(/\s+to my(?: Bahamas)? trip\.?$/i, '')

  return withoutMutationVerb || clean
}
