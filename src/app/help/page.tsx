import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Baha Buddy help center for trip planning, bookings, accounts, and support.',
}

export default function HelpPage() {
  return (
    <UtilityContentLayout
      activePath="/help"
      title="Help center"
      subtitle="Quick answers for planning, booking, accounts, and support."
    >
      <section>
        <h2>Planning help</h2>
        <p>
          Use Buddy when you need help choosing islands, comparing stays, finding
          activities, planning food stops, or building a day-by-day trip.
        </p>
      </section>
      <section>
        <h2>Booking help</h2>
        <p>
          For booking questions, include your booking reference, trip name,
          travel dates, and the email attached to your account.
        </p>
      </section>
      <section>
        <h2>Account help</h2>
        <p>
          If you cannot sign in or find a trip, contact support from the email
          address used for your Baha Buddy account.
        </p>
      </section>
      <section>
        <h2>Contact support</h2>
        <p>
          Email <a href="mailto:support@bahabuddy.com">support@bahabuddy.com</a>.
        </p>
      </section>
    </UtilityContentLayout>
  )
}
