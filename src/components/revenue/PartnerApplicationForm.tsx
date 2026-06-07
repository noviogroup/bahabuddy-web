const partnerCategories = [
  'Hotels and resorts',
  'Boutique stays and villas',
  'Tour operators',
  'Restaurants and bars',
  'Transportation providers',
  'Boat charters',
  'Airport transfers',
  'Airlines and island connections',
  'Local guides and experience hosts',
  'Event organizers',
  'Visa and travel-document services',
  'Destination and island stakeholders',
]

const tiers = ['Free Listing', 'Verified Partner', 'Featured Partner', 'Premium / Strategic', 'Not sure yet']

export default function PartnerApplicationForm() {
  return (
    <form
      name="baha-buddy-partner-application"
      method="POST"
      action="/partners?submitted=partner"
      data-netlify="true"
      netlify-honeypot="bot-field"
      className="rounded-baha-xl bg-white border border-sand-200 p-6 lg:p-8 shadow-card space-y-5"
    >
      <input type="hidden" name="form-name" value="baha-buddy-partner-application" />
      <p className="hidden">
        <label>
          Do not fill this out: <input name="bot-field" />
        </label>
      </p>

      <div>
        <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Partner application</p>
        <h3 className="mt-2 text-2xl font-extrabold text-night">Submit your business for review</h3>
        <p className="mt-2 text-sm text-charcoal leading-relaxed">
          This creates an early partner inquiry for manual review before Baha Buddy launches a full
          self-service partner portal.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-semibold text-night">Business name *</span>
          <input name="business_name" required className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Category *</span>
          <select name="category" required className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500 bg-white">
            <option value="">Select category</option>
            {partnerCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Island / service area</span>
          <input name="island_service_area" placeholder="Nassau, Exuma, Eleuthera..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Contact person</span>
          <input name="contact_name" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Email *</span>
          <input name="email" type="email" required className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Phone</span>
          <input name="phone" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Website / social link</span>
          <input name="website_or_social" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-night">Interested tier</span>
          <select name="interested_tier" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500 bg-white">
            {tiers.map((tier) => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-night">Current booking method</span>
        <input name="booking_method" placeholder="Website, phone, WhatsApp, FareHarbor, direct email..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-night">Short description</span>
        <textarea name="description" rows={4} className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
      </label>

      <button type="submit" className="w-full rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700 transition-colors">
        Submit partner application
      </button>
    </form>
  )
}
