import StoreBadgeLinks from '@/components/StoreBadgeLinks'

interface OpenInAppInstructionsProps {
  /** Signed-in email to show, so travelers sign in to the app with the same account. */
  email?: string | null
  className?: string
}

/** How to take a web-owned tour into the Baha Buddy app. */
export default function OpenInAppInstructions({ email, className }: OpenInAppInstructionsProps) {
  return (
    <section
      aria-labelledby="open-in-app-heading"
      className={['rounded-baha-lg border border-brand-100 bg-brand-50 p-5', className].filter(Boolean).join(' ')}
    >
      <h2 id="open-in-app-heading" className="text-base font-bold text-night">Open your tours in the app</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-charcoal">
        <li>Download Baha Buddy for iPhone or Android.</li>
        <li>
          Sign in with the same account you use here
          {email ? <> (<span className="font-semibold text-night">{email}</span>)</> : null}.
        </li>
        <li>Open Self-guided tours. Your tours are ready to start.</li>
      </ol>
      <p className="mt-3 text-xs leading-5 text-gray-600">
        Tours belong to your Baha Buddy account, not your device. The email you sign in with in the app must match this account. If you signed up with Google or Apple, use that same option in the app.
      </p>
      <StoreBadgeLinks className="mt-4 justify-start" height={40} />
    </section>
  )
}
