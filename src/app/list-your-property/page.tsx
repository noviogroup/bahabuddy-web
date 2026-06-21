import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'
import PartnerApplicationForm from '@/components/revenue/PartnerApplicationForm'

export const metadata: Metadata = {
  title: 'List Your Property',
  description: 'List a Bahamas hotel, resort, villa, home, apartment, or condo with Baha Buddy.',
}

export default function ListYourPropertyPage({
  searchParams,
}: {
  searchParams?: { submitted?: string }
}) {
  const submitted = searchParams?.submitted === 'property'

  return (
    <UtilityContentLayout
      activePath="/list-your-property"
      title="List your property"
      subtitle="Hotels, resorts, villas, homes, apartments, and condos can apply to be reviewed for Baha Buddy placement."
    >
      <section>
        <h2>Who should apply</h2>
        <p>
          Bahamas lodging operators, property managers, boutique hotel teams,
          resort teams, villa owners, and vacation-rental operators can apply for
          listing review.
        </p>
      </section>
      <section>
        <h2>What we review</h2>
        <ul>
          <li>Property name and island.</li>
          <li>Property type and guest fit.</li>
          <li>Official booking or contact method.</li>
          <li>Current imagery and amenities.</li>
          <li>Policies, rates, and availability integration options.</li>
        </ul>
      </section>
      <section>
        <h2>Start the process</h2>
        <p>
          Use the property application below. It routes into the same partner
          review workflow so the Baha Buddy team can evaluate the stay type,
          island, imagery, amenities, and booking method.
        </p>
        {submitted && (
          <p>
            Property application received. The Baha Buddy team can now review
            the property for marketplace placement.
          </p>
        )}
      </section>
      <section>
        <h2>Property application</h2>
        <PartnerApplicationForm
          action="/list-your-property?submitted=property"
          title="Submit your property for review"
          description="This creates a lodging partner inquiry for review before Baha Buddy adds the property to stays, destination pages, or Buddy recommendations."
        />
      </section>
    </UtilityContentLayout>
  )
}
