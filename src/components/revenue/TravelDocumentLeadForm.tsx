import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
  TravelSearchTextarea,
} from '@/components/marketplace/TravelSearchFields'

const leadTypes = [
  'Bahamas visitor visa support',
  'Travel document checklist',
  'Group travel documentation',
  'Corporate travel documentation',
  'Work permit inquiry',
  'Residence permit inquiry',
  'Investor travel advisory',
]

export default function TravelDocumentLeadForm() {
  return (
    <form
      name="baha-buddy-travel-document-lead"
      method="POST"
      action="/concierge-trip-plan?submitted=documents"
      data-netlify="true"
      netlify-honeypot="bot-field"
      className="mt-8 rounded-baha-xl bg-white/10 border border-white/15 p-6 space-y-4"
    >
      <input type="hidden" name="form-name" value="baha-buddy-travel-document-lead" />
      <p className="hidden">
        <label>
          Do not fill this out: <input name="bot-field" />
        </label>
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <TravelSearchField label="Name" hint="Required" htmlFor="document-lead-name" className="bg-white">
          <TravelSearchInput id="document-lead-name" name="name" required />
        </TravelSearchField>
        <TravelSearchField label="Email" hint="Required" htmlFor="document-lead-email" className="bg-white">
          <TravelSearchInput id="document-lead-email" name="email" type="email" required />
        </TravelSearchField>
        <TravelSearchField label="Nationality" htmlFor="document-lead-nationality" className="bg-white">
          <TravelSearchInput id="document-lead-nationality" name="nationality" />
        </TravelSearchField>
        <TravelSearchField label="Lead type" htmlFor="document-lead-type" className="bg-white">
          <TravelSearchSelect id="document-lead-type" name="lead_type">
            {leadTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </TravelSearchSelect>
        </TravelSearchField>
      </div>

      <TravelSearchField label="Notes" htmlFor="document-lead-notes" className="bg-white">
        <TravelSearchTextarea id="document-lead-notes" name="notes" rows={3} className="min-h-24" />
      </TravelSearchField>

      <button type="submit" className="w-full rounded-full bg-gold-400 px-6 py-3 text-night font-extrabold hover:bg-gold-300 transition-colors">
        Submit travel-document request
      </button>
    </form>
  )
}
