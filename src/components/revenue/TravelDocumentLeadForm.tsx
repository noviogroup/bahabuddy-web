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
        <label className="block">
          <span className="text-sm font-semibold text-white">Name *</span>
          <input name="name" required className="mt-2 w-full rounded-baha-md border border-white/20 bg-white px-4 py-3 text-sm text-night outline-none focus:border-gold-400" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-white">Email *</span>
          <input name="email" type="email" required className="mt-2 w-full rounded-baha-md border border-white/20 bg-white px-4 py-3 text-sm text-night outline-none focus:border-gold-400" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-white">Nationality</span>
          <input name="nationality" className="mt-2 w-full rounded-baha-md border border-white/20 bg-white px-4 py-3 text-sm text-night outline-none focus:border-gold-400" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-white">Lead type</span>
          <select name="lead_type" className="mt-2 w-full rounded-baha-md border border-white/20 bg-white px-4 py-3 text-sm text-night outline-none focus:border-gold-400">
            {leadTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-white">Notes</span>
        <textarea name="notes" rows={3} className="mt-2 w-full rounded-baha-md border border-white/20 bg-white px-4 py-3 text-sm text-night outline-none focus:border-gold-400" />
      </label>

      <button type="submit" className="w-full rounded-full bg-gold-400 px-6 py-3 text-night font-extrabold hover:bg-gold-300 transition-colors">
        Submit travel-document request
      </button>
    </form>
  )
}
