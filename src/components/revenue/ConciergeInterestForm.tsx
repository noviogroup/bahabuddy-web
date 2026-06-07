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
      className="rounded-baha-xl bg-white border border-sand-200 p-6 lg:p-8 shadow-card space-y-5"
    >
      <input type="hidden" name="form-name" value="baha-buddy-concierge-interest" />
      <p className="hidden">
        <label>
          Do not fill this out: <input name="bot-field" />
        </label>
      </p>

      <div>
        <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Concierge request</p>
        <h3 className="mt-2 text-2xl font-extrabold text-night">Send your trip for review</h3>
        <p className="mt-2 text-sm text-charcoal leading-relaxed">
          Share the basic details. The team can follow up with payment, questions, and next steps
          while Stripe checkout is being connected.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-semibold text-night">Name *</span>
          <input name="name" required className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Email *</span>
          <input name="email" type="email" required className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Offer</span>
          <select name="offer" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500 bg-white">
            {offers.map((offer) => (
              <option key={offer} value={offer}>{offer}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Travel dates</span>
          <input name="travel_dates" placeholder="Exact or estimated" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Group size</span>
          <input name="group_size" placeholder="2 adults, family of 4..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Budget range</span>
          <input name="budget_range" placeholder="$1,500-$3,000, luxury, flexible..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-night">Islands or trip style</span>
        <input name="trip_interests" placeholder="Nassau, Exuma, honeymoon, family, group, adventure..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-night">Notes</span>
        <textarea name="notes" rows={4} className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
      </label>

      <button type="submit" className="w-full rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700 transition-colors">
        Submit concierge request
      </button>
    </form>
  )
}
