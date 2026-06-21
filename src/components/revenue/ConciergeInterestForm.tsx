import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
  TravelSearchTextarea,
} from '@/components/marketplace/TravelSearchFields'

const offers = [
  'Quick Review - $49',
  'Concierge Trip Plan - $149',
  'Full Planning Support - $299',
  'Group / Corporate Plan - Custom',
]

export default function ConciergeInterestForm() {
  return (
    <form
      name="baha-buddy-concierge-interest"
      method="POST"
      action="/concierge-trip-plan?submitted=concierge"
      data-netlify="true"
      netlify-honeypot="bot-field"
      className="rounded-baha-xl bg-white border border-gray-200 p-6 lg:p-8 shadow-sm space-y-5"
    >
      <input type="hidden" name="form-name" value="baha-buddy-concierge-interest" />
      <p className="hidden">
        <label>
          Do not fill this out: <input name="bot-field" />
        </label>
      </p>

      <div>
        <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 uppercase tracking-wide">
          <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
          Concierge request
        </p>
        <h3 className="mt-2 text-2xl font-extrabold text-night">Send your trip for review</h3>
        <p className="mt-2 text-sm text-charcoal leading-relaxed">
          Share the basic details. The team can follow up with payment, questions, and next steps
          while Stripe checkout is being connected.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <TravelSearchField label="Name" hint="Required" htmlFor="concierge-interest-name" className="bg-white">
          <TravelSearchInput id="concierge-interest-name" name="name" required />
        </TravelSearchField>
        <TravelSearchField label="Email" hint="Required" htmlFor="concierge-interest-email" className="bg-white">
          <TravelSearchInput id="concierge-interest-email" name="email" type="email" required />
        </TravelSearchField>
        <TravelSearchField label="Offer" htmlFor="concierge-interest-offer" className="bg-white">
          <TravelSearchSelect id="concierge-interest-offer" name="offer">
            {offers.map((offer) => (
              <option key={offer} value={offer}>{offer}</option>
            ))}
          </TravelSearchSelect>
        </TravelSearchField>
        <TravelSearchField label="Travel dates" htmlFor="concierge-interest-dates" className="bg-white">
          <TravelSearchInput id="concierge-interest-dates" name="travel_dates" placeholder="Exact or estimated" />
        </TravelSearchField>
        <TravelSearchField label="Group size" htmlFor="concierge-interest-group" className="bg-white">
          <TravelSearchInput id="concierge-interest-group" name="group_size" placeholder="2 adults, family of 4" />
        </TravelSearchField>
        <TravelSearchField label="Budget range" htmlFor="concierge-interest-budget" className="bg-white">
          <TravelSearchInput id="concierge-interest-budget" name="budget_range" placeholder="$1,500-$3,000, luxury, flexible" />
        </TravelSearchField>
      </div>

      <TravelSearchField label="Islands or trip style" htmlFor="concierge-interest-style" className="bg-white">
        <TravelSearchInput id="concierge-interest-style" name="trip_interests" placeholder="Nassau, Exuma, honeymoon, family, group, adventure" />
      </TravelSearchField>

      <TravelSearchField label="Notes" htmlFor="concierge-interest-notes" className="bg-white">
        <TravelSearchTextarea id="concierge-interest-notes" name="notes" rows={4} />
      </TravelSearchField>

      <button type="submit" className="w-full rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700 transition-colors">
        Submit concierge request
      </button>
    </form>
  )
}
