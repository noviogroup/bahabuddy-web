'use client'

/**
 * IslandExplorerRow — horizontal scroll of circular island avatars.
 *
 * 9 islands sourced from src/lib/baha-images.ts. Tap → /explore/island/[slug].
 *
 * Mobile reference: IslandExplorerRow widget in
 *   lib/features/home/screens/home_screen.dart
 *
 * Visual: 80px circle, 2px brand-tinted ring on hover, name label below.
 * Scrolls horizontally with momentum on touch; no scrollbar visible.
 */

import Link from 'next/link'
import Image from 'next/image'
import { ISLANDS, BahaImages } from '@/lib/baha-images'

export default function IslandExplorerRow() {
  return (
    <section aria-label="Explore islands">
      <div className="flex items-center justify-between px-5 md:px-6 mb-3">
        <h2 className="text-sm font-bold text-night uppercase tracking-wider">
          Explore Islands
        </h2>
        <Link
          href="/explore"
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          See all →
        </Link>
      </div>

      <div
        className="flex gap-4 px-5 md:px-6 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
        {ISLANDS.map(island => (
          <Link
            key={island.slug}
            href={`/explore/island/${island.slug}`}
            className="group shrink-0 flex flex-col items-center gap-2 snap-start"
            title={island.name}
          >
            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-brand-400 transition-all duration-200 shadow-soft group-hover:shadow-card-hover">
              <Image
                src={BahaImages[island.imageKey]}
                alt={island.name}
                fill
                sizes="80px"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="text-xs font-semibold text-charcoal group-hover:text-brand-700 transition-colors max-w-[88px] text-center truncate">
              {island.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
