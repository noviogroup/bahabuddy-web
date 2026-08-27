import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'
import SanityManagedContentPage from '@/components/marketplace/SanityManagedContentPage'
import { fetchContentPageByRoute } from '@/lib/sanity/queries'

export const metadata: Metadata = {
  title: 'Contact Baha Buddy',
  description: 'Contact Baha Buddy support, partnerships, and business inquiries.',
}

export default async function ContactPage() {
  const managedPage = await fetchContentPageByRoute('/contact')
  if (managedPage) return <SanityManagedContentPage page={managedPage} />

  return (
    <UtilityContentLayout
      activePath="/contact"
      title="Contact us"
      subtitle="The right contact path depends on what you need help with."
    >
      <section>
        <h2>Traveler support</h2>
        <p>
          For account, trip, or booking support, email{' '}
          <a href="mailto:support@bahabuddy.com">support@bahabuddy.com</a>.
        </p>
      </section>
      <section>
        <h2>Partnerships</h2>
        <p>
          Hotels, restaurants, tour operators, transportation providers, and
          island stakeholders can start at{' '}
          <a href="/partners">Partner with us</a>.
        </p>
      </section>
      <section>
        <h2>Business inquiries</h2>
        <p>
          Contact Novio Group at{' '}
          <a href="mailto:hello@noviogroup.com">hello@noviogroup.com</a>.
        </p>
      </section>
    </UtilityContentLayout>
  )
}
