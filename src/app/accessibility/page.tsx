import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'

export const metadata: Metadata = {
  title: 'Accessibility',
  description: 'Baha Buddy accessibility statement and support contact.',
}

export default function AccessibilityPage() {
  return (
    <UtilityContentLayout
      activePath="/accessibility"
      title="Accessibility"
      subtitle="Baha Buddy is designed to be usable across devices, input methods, and assistive technologies."
    >
      <section>
        <h2>Our standard</h2>
        <p>
          We aim to keep Baha Buddy readable, keyboard accessible, screen-reader
          friendly, and usable on mobile and desktop screens.
        </p>
      </section>
      <section>
        <h2>What we prioritize</h2>
        <ul>
          <li>Semantic page structure and landmarks.</li>
          <li>Visible focus states for links, buttons, and forms.</li>
          <li>Readable color contrast using the Baha Buddy color system.</li>
          <li>Plain-language labels and error messages.</li>
          <li>Reduced-motion support where animation is present.</li>
        </ul>
      </section>
      <section>
        <h2>Report an issue</h2>
        <p>
          If you encounter an accessibility issue, contact{' '}
          <a href="mailto:support@bahabuddy.com">support@bahabuddy.com</a> with
          the page URL, device, browser, and a short description of the problem.
        </p>
      </section>
    </UtilityContentLayout>
  )
}
