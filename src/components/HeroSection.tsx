import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-900 via-blue-800 to-cyan-700 text-white">
      {/* Decorative wave overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute bottom-0 w-full h-48">
          <path
            fill="white"
            d="M0,192L48,181.3C96,171,192,149,288,160C384,171,480,213,576,213.3C672,213,768,171,864,154.7C960,139,1056,149,1152,165.3C1248,181,1344,203,1392,213.3L1440,224L1440,320L0,320Z"
          />
        </svg>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-36">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span>🏝️</span>
            <span>AI-Powered Bahamas Travel Companion</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
            Plan Your{' '}
            <span className="text-cyan-300">Perfect</span>{' '}
            Bahamas{' '}
            <span className="text-cyan-300">Trip</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl leading-relaxed">
            Baha Buddy uses AI to build personalized itineraries, find deals, and guide you through
            700+ Bahamas islands — all from your phone.
          </p>

          {/* App download CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-4 transition-colors group"
              aria-label="Download Baha Buddy on the App Store"
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-300">Download on the</div>
                <div className="text-lg font-semibold leading-tight">App Store</div>
              </div>
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white rounded-xl px-6 py-4 transition-colors"
              aria-label="Get Baha Buddy on Google Play"
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76c.36.19.77.21 1.16.06l12.24-7.07-2.65-2.65-10.75 9.66zM.94 1.05C.36 1.52 0 2.28 0 3.26v17.47c0 .98.36 1.74.95 2.22l.12.1 9.77-9.77v-.23L1.06.95.94 1.05zM22.41 10.3l-2.79-1.61-2.99 2.99 2.99 2.99 2.81-1.62c.8-.46.8-1.21-.02-1.75zM4.34.18L16.58 7.25l-2.65 2.65L3.18.24A1.32 1.32 0 014.34.18z" />
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-300">Get it on</div>
                <div className="text-lg font-semibold leading-tight">Google Play</div>
              </div>
            </a>
          </div>

          {/* Web dashboard link */}
          <p className="text-blue-200 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-300 hover:text-white underline underline-offset-2 transition-colors">
              Sign in to your dashboard →
            </Link>
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '700+', label: 'Islands & Cays' },
              { value: 'AI', label: 'Powered Planning' },
              { value: 'Free', label: 'To Download' },
              { value: '24/7', label: 'Travel Assistant' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-cyan-300">{stat.value}</div>
                <div className="text-sm text-blue-200 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
