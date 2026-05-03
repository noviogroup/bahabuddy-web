const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Trip Planner',
    description:
      'Chat with Baha Buddy AI to build custom itineraries tailored to your travel style, budget, and party size.',
  },
  {
    icon: '✈️',
    title: 'Flight Search',
    description:
      'Compare real-time flight prices and book directly from the app. Duffel-powered for the best rates.',
  },
  {
    icon: '🏨',
    title: 'Hotel Booking',
    description:
      'Browse thousands of hotels and resorts across the Bahamas with live availability and pricing.',
  },
  {
    icon: '🗺️',
    title: 'Island Explorer',
    description:
      'Swipe through 700+ islands and cays. Find hidden beaches, local restaurants, and authentic experiences.',
  },
  {
    icon: '📋',
    title: 'Saved Itineraries',
    description:
      'Your trips are always backed up. Switch to web when you need a bigger screen or share with travel partners.',
  },
  {
    icon: '💰',
    title: 'Deals & Packages',
    description:
      'Get notified about exclusive Bahamas deals — all-inclusive packages, island-hopping tours, and more.',
  },
]

export default function AppFeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <span>✨</span>
            <span>Everything You Need</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            One App for Your Entire Bahamas Trip
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            From dreaming to landing — Baha Buddy handles flights, hotels, activities, and on-island
            guidance in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="group">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:bg-blue-100 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
