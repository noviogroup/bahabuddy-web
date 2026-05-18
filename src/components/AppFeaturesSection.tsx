const FEATURES = [
  {
    title: 'AI Trip Planner',
    description:
      'Chat with Baha Buddy AI to build custom itineraries tailored to your travel style, budget, and party size.',
  },
  {
    title: 'Flight Search',
    description:
      'Compare real-time flight prices and book directly from the app. Duffel-powered for the best rates.',
  },
  {
    title: 'Hotel Booking',
    description:
      'Browse thousands of hotels and resorts across the Bahamas with live availability and pricing.',
  },
  {
    title: 'Island Explorer',
    description:
      'Swipe through 700+ islands and cays. Find hidden beaches, local restaurants, and authentic experiences.',
  },
  {
    title: 'Saved Itineraries',
    description:
      'Your trips are always backed up. Switch to web when you need a bigger screen or share with travel partners.',
  },
  {
    title: 'Deals & Packages',
    description:
      'Get notified about exclusive Bahamas deals — all-inclusive packages, island-hopping tours, and more.',
  },
]

export default function AppFeaturesSection() {
  return (
    <section className="py-24 bg-stone-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-brand-600 text-sm font-semibold tracking-widest uppercase mb-3">
            Everything You Need
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            One App for Your Entire Bahamas Trip
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            From dreaming to landing — Baha Buddy handles flights, hotels, activities,
            and on-island guidance in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <div key={feature.title} className="group">
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-sm font-bold text-brand-700 mb-4 group-hover:bg-brand-100 transition-colors">
                {index + 1}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
