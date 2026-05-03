interface Attraction {
  id: string
  name: string
  category: string
  island: string | null
  description: string
  image_url: string | null
  tags: string[]
}

const FALLBACK_ATTRACTIONS: Attraction[] = [
  {
    id: '1',
    name: 'Nassau',
    category: 'Island',
    island: 'nassau',
    description: 'The vibrant capital city of the Bahamas — colorful colonial architecture, world-class dining, and stunning beaches.',
    image_url: null,
    tags: ['Culture', 'Beaches', 'Shopping'],
  },
  {
    id: '2',
    name: 'Exuma',
    category: 'Island',
    island: 'exuma',
    description: 'Home to the swimming pigs and some of the world\'s most pristine turquoise waters and sandbars.',
    image_url: null,
    tags: ['Swimming Pigs', 'Snorkeling', 'Secluded'],
  },
  {
    id: '3',
    name: 'Eleuthera',
    category: 'Island',
    island: 'eleuthera',
    description: 'Stunning pink sand beaches, Glass Window Bridge, and a laidback island lifestyle away from the crowds.',
    image_url: null,
    tags: ['Pink Sand', 'Surfing', 'Off-the-beaten-path'],
  },
  {
    id: '4',
    name: 'Harbour Island',
    category: 'Island',
    island: 'harbour-island',
    description: 'Famous for its charming pink sand beach and colorful colonial cottages. Golf carts are the main transport.',
    image_url: null,
    tags: ['Pink Sand', 'Boutique', 'Romantic'],
  },
  {
    id: '5',
    name: 'The Abacos',
    category: 'Island',
    island: 'abacos',
    description: 'The sailing capital of the Bahamas with charming Loyalist Cays, world-class marinas, and crystal-clear waters.',
    image_url: null,
    tags: ['Sailing', 'Boating', 'Fishing'],
  },
  {
    id: '6',
    name: 'Paradise Island',
    category: 'Island',
    island: 'paradise-island',
    description: 'Connected to Nassau by bridge, home to Atlantis Resort, casinos, and beautiful beaches.',
    image_url: null,
    tags: ['Resorts', 'Atlantis', 'Family'],
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  Island: 'bg-blue-100 text-blue-700',
  Beach: 'bg-amber-100 text-amber-700',
  'Water Activity': 'bg-cyan-100 text-cyan-700',
  Culture: 'bg-purple-100 text-purple-700',
  Nature: 'bg-green-100 text-green-700',
  Dining: 'bg-rose-100 text-rose-700',
}

const GRADIENT_COLORS = [
  'from-blue-400 to-cyan-500',
  'from-teal-400 to-emerald-500',
  'from-sky-400 to-blue-500',
  'from-cyan-400 to-teal-500',
  'from-indigo-400 to-blue-500',
  'from-blue-500 to-sky-400',
]

interface Props {
  attractions: Attraction[]
}

export default function DestinationShowcase({ attractions }: Props) {
  const items = attractions.length > 0 ? attractions : FALLBACK_ATTRACTIONS

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <span>🏝️</span>
            <span>Explore the Bahamas</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            700+ Islands to Discover
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            From world-famous Nassau to hidden gems, Baha Buddy knows every corner of the Bahamas
            and helps you find the perfect destination.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((attraction, index) => {
            const gradientClass = GRADIENT_COLORS[index % GRADIENT_COLORS.length]
            const categoryColor = CATEGORY_COLORS[attraction.category] ?? 'bg-gray-100 text-gray-600'

            return (
              <div
                key={attraction.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                {/* Image / placeholder */}
                <div className={`relative h-44 bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden`}>
                  {attraction.image_url ? (
                    <img
                      src={attraction.image_url}
                      alt={attraction.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-6xl opacity-60">🏝️</span>
                  )}

                  {/* Category badge */}
                  <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-2.5 py-1 ${categoryColor}`}>
                    {attraction.category}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{attraction.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-3">
                    {attraction.description}
                  </p>

                  {attraction.tags && attraction.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {attraction.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-50 text-blue-600 rounded-full px-2.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-500 mb-4">
            Discover all destinations in the Baha Buddy app
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl px-6 py-3 font-medium transition-colors"
            >
              <span>🍎</span> Download on iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl px-6 py-3 font-medium transition-colors"
            >
              <span>🤖</span> Download on Android
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
