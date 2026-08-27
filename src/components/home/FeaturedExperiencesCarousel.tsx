import Image from 'next/image'
import Link from 'next/link'

export interface FeaturedExperience {
  title: string
  island: string
  category: string
  href: string
  image: string
}

interface FeaturedExperiencesCarouselProps {
  experiences: FeaturedExperience[]
}

export default function FeaturedExperiencesCarousel({
  experiences,
}: FeaturedExperiencesCarouselProps) {
  if (experiences.length === 0) return null

  return (
    <div aria-label="Featured Bahamas experiences">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {experiences.map((experience) => (
          <Link
            key={experience.title}
            href={experience.href}
            aria-label={`View details for ${experience.title}`}
            data-testid="featured-experience-card"
            className="group overflow-hidden rounded-baha-lg bg-white shadow-soft ring-1 ring-gray-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
              <Image
                src={experience.image}
                alt={`${experience.title} in The Bahamas`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 272px, 304px"
                unoptimized
              />
              <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-brand-700 shadow-soft">
                {experience.category}
              </span>
            </div>

            <div className="p-4">
              <p className="text-xs font-black uppercase text-brand-700">{experience.island}</p>
              <h3
                data-testid="featured-experience-card-title"
                className="mt-2 line-clamp-2 min-h-12 text-lg font-bold leading-6 text-night"
              >
                {experience.title}
              </h3>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-charcoal">Plan with Buddy</span>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 group-hover:bg-brand-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
