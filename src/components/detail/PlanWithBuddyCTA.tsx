import Link from 'next/link'

/**
 * PlanWithBuddyCTA — the shared "chat handoff" panel at the bottom of
 * every detail page (article, hotel, activity, restaurant).
 *
 * The detail page is the *content* layer; this CTA is the bridge back
 * into the *action* layer (chat). It carries two affordances:
 *
 *   1. "Ask Buddy about this" — opens chat with a question-style prompt
 *      so the user can dig deeper conversationally
 *   2. "Add to my trip" — opens chat with an itinerary-action prompt
 *      so the agent runs create_itinerary_item or builds a slot
 *
 * Copy varies by `kind`. Stay = hotels. Experience = activities &
 * articles. Meal = restaurants.
 *
 * Both buttons funnel into /dashboard/chat?q=... which is the existing
 * pre-filled chat entry point used elsewhere (Sidebar quick actions,
 * EmptySlotChatLink on trip pages).
 */

export type CTAKind = 'stay' | 'experience' | 'meal'

interface PlanWithBuddyCTAProps {
  /** Prompt for the "Ask Buddy about this" primary CTA. */
  planPrompt: string
  /** Prompt for the "Add to my trip" secondary CTA. */
  addPrompt: string
  /** Kind drives the copy tone. */
  kind: CTAKind
}

export function PlanWithBuddyCTA({ planPrompt, addPrompt, kind }: PlanWithBuddyCTAProps) {
  const headline =
    kind === 'stay'      ? 'Make it part of your trip'
    : kind === 'meal'    ? 'Add it to your plan'
    :                      'Plan this experience'

  const sub =
    kind === 'stay'      ? "Buddy can pair this stay with flights, activities nearby, and a full day-by-day plan."
    : kind === 'meal'    ? "Buddy can fit this meal into your day plan and suggest what to do on either side of it."
    :                      "Buddy can build a half-day or full-day around it, with timing, transport, and what else fits nearby."

  return (
    <section className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-baha-lg p-6 sm:p-8 text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-100 mb-2">
        Plan with Buddy
      </p>
      <h2 className="text-xl sm:text-2xl font-bold mb-3">
        {headline}
      </h2>
      <p className="text-sm text-brand-100 mb-5 leading-relaxed max-w-lg">
        {sub}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/chat?q=${encodeURIComponent(planPrompt)}`}
          className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
        >
          Ask Buddy about this
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
        <Link
          href={`/dashboard/chat?q=${encodeURIComponent(addPrompt)}`}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors border border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
        >
          Add to my trip
        </Link>
      </div>
    </section>
  )
}
