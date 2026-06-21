import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
  TravelSearchTextarea,
} from '@/components/marketplace/TravelSearchFields'

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

type PartnerApplicationFormProps = {
  action?: string
  title?: string
  description?: string
}

export default function PartnerApplicationForm({
  action = '/partners?submitted=partner',
  title = 'Submit your business for review',
  description = 'This creates an early partner inquiry for manual review before Baha Buddy launches a full self-service partner portal.',
}: PartnerApplicationFormProps) {
  return (
    <form
      name="baha-buddy-partner-application"
      method="POST"
      action={action}
      data-netlify="true"
      netlify-honeypot="bot-field"
      className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5 lg:p-8"
    >
      <input type="hidden" name="form-name" value="baha-buddy-partner-application" />
      <p className="hidden">
        <label>
          Do not fill this out: <input name="bot-field" />
        </label>
      </p>

      <div>
        <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Partner application</p>
        <h3 className="mt-2 text-2xl font-extrabold text-night">{title}</h3>
        <p className="mt-2 text-sm text-charcoal leading-relaxed">
          {description}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <TravelSearchField label="Business name" hint="Required" htmlFor="partner-business-name" className="bg-white">
          <TravelSearchInput id="partner-business-name" name="business_name" required />
        </TravelSearchField>
        <TravelSearchField label="Category" hint="Required" htmlFor="partner-category" className="bg-white">
          <TravelSearchSelect id="partner-category" name="category" required>
            <option value="">Select category</option>
            {partnerCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </TravelSearchSelect>
        </TravelSearchField>
        <TravelSearchField label="Island / service area" htmlFor="partner-service-area" className="bg-white">
          <TravelSearchInput id="partner-service-area" name="island_service_area" placeholder="Nassau, Exuma, Eleuthera" />
        </TravelSearchField>
        <TravelSearchField label="Contact person" htmlFor="partner-contact-name" className="bg-white">
          <TravelSearchInput id="partner-contact-name" name="contact_name" />
        </TravelSearchField>
        <TravelSearchField label="Email" hint="Required" htmlFor="partner-email" className="bg-white">
          <TravelSearchInput id="partner-email" name="email" type="email" required />
        </TravelSearchField>
        <TravelSearchField label="Phone" htmlFor="partner-phone" className="bg-white">
          <TravelSearchInput id="partner-phone" name="phone" />
        </TravelSearchField>
        <TravelSearchField label="Website / social link" htmlFor="partner-website" className="bg-white">
          <TravelSearchInput id="partner-website" name="website_or_social" />
        </TravelSearchField>
        <TravelSearchField label="Interested tier" htmlFor="partner-tier" className="bg-white">
          <TravelSearchSelect id="partner-tier" name="interested_tier">
            {tiers.map((tier) => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </TravelSearchSelect>
        </TravelSearchField>
      </div>

      <TravelSearchField label="Current booking method" htmlFor="partner-booking-method" className="bg-white">
        <TravelSearchInput
          id="partner-booking-method"
          name="booking_method"
          placeholder="Website, phone, WhatsApp, FareHarbor, direct email"
        />
      </TravelSearchField>

      <TravelSearchField label="Short description" htmlFor="partner-description" className="bg-white">
        <TravelSearchTextarea id="partner-description" name="description" rows={4} />
      </TravelSearchField>

      <button type="submit" className="w-full rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700 transition-colors">
        Submit partner application
      </button>
    </form>
  )
}
