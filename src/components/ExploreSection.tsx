'use client'


const COLLECTIONS = [
  {
    id: 'nassau-beaches',
    title: 'Top Beaches in Nassau',
    tagCount: '12 beaches',
    prompt: 'Show me the top beaches in Nassau Bahamas',
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
    emoji: '🏖️',
  },
  {
    id: 'exuma-rum',
    title: 'Best Rum Bars in Exuma',
    tagCount: '8 bars',
    prompt: 'Best rum bars and drinks spots in Exuma Bahamas',
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg',
    emoji: '🍹',
  },
  {
    id: 'snorkelling',
    title: 'Family Snorkelling Spots',
    tagCount: '15 spots',
    prompt: 'Best family-friendly snorkelling spots in the Bahamas',
    image: 'https://tempo.cdn.tambourine.com/windsong/media/cache/exumacaylands-5f5033a0c216a-1500x643.jpg',
    emoji: '🤿',
  },
  {
    id: 'luxury-resorts',
    title: 'Luxury Resorts',
    tagCount: '20 resorts',
    prompt: 'Top luxury resorts in the Bahamas',
    image: 'https://tempo.cdn.tambourine.com/windsong/media/cache/queenshighway-5f525b6953653-1500x643.jpg',
    emoji: '🏨',
  },
  {
    id: 'swimming-pigs',
    title: 'Swimming with Pigs',
    tagCount: '5 tours',
    prompt: 'How to swim with the pigs in Exuma Bahamas — best tours and tips',
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
    emoji: '🐷',
  },
  {
    id: 'junkanoo',
    title: 'Junkanoo Culture',
    tagCount: '10 experiences',
    prompt: 'Junkanoo festival and cultural experiences in the Bahamas',
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-the-abacos-islands-img-5f765543ac3d5.jpg',
    emoji: '🥁',
  },
]

export default function ExploreSection() {
  const handleCollection = (prompt: string) => {
    window.location.href = `/dashboard?q=${encodeURIComponent(prompt)}`
  }

  return (
    <section className="py-24 bg-gray-950">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Curated Collections
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Explore by Vibe
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Hand-picked Bahamas experiences — click any collection and Baha Buddy
            builds your itinerary instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {COLLECTIONS.map((col) => (
            <button
              key={col.id}
              onClick={() => handleCollection(col.prompt)}
              className="relative rounded-2xl overflow-hidden aspect-[4/3] group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              aria-label={`Explore: ${col.title}`}
            >
              {/* Background image via CSS */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${col.image})` }}
              />

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 group-hover:from-black/70 transition-all duration-300" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <div className="text-2xl mb-2">{col.emoji}</div>
                <h3 className="text-white text-xl font-bold leading-tight mb-1">
                  {col.title}
                </h3>
                <p className="text-white/60 text-sm font-medium">
                  {col.tagCount}
                </p>
              </div>

              {/* Hover CTA */}
              <div className="absolute top-4 right-4 bg-white/0 group-hover:bg-white/15 text-white/0 group-hover:text-white text-xs font-semibold rounded-full px-3 py-1.5 border border-white/0 group-hover:border-white/30 backdrop-blur-sm transition-all duration-300">
                Explore →
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
