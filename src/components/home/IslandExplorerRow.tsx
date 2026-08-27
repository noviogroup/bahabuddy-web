"use client";

/**
 * IslandExplorerRow — horizontal scroll of circular island avatars.
 *
 * Bahamas islands sourced from src/lib/baha-images.ts. Tap → /explore/island/[slug].
 *
 * Mobile reference: IslandExplorerRow widget in
 *   lib/features/home/screens/home_screen.dart
 *
 * Visual: 80px circle, 2px brand-tinted ring on hover, name label below.
 * Scrolls horizontally with momentum on touch; no scrollbar visible.
 */

import Link from "next/link";
import Image from "next/image";
import { ISLANDS, BahaImages } from "@/lib/baha-images";

export default function IslandExplorerRow() {
  return (
    <section aria-label="Explore islands">
      <div className="mb-3 flex items-center justify-between px-5 md:px-6">
        <h2 className="text-sm font-bold text-night uppercase r">
          Explore Islands
        </h2>
        <Link
          href="/explore"
          className="inline-flex min-h-11 items-center rounded-full px-2 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
        >
          See all →
        </Link>
      </div>

      <div className="relative after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-12 after:bg-gradient-to-l after:from-offwhite after:to-transparent md:after:hidden">
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 pr-12 md:px-6 md:pr-6"
        style={{ scrollbarWidth: "none" }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {ISLANDS.map((island) => (
          <Link
            key={island.slug}
            href={`/explore/island/${island.slug}`}
            className="group flex min-h-[6.5rem] shrink-0 snap-start flex-col items-center gap-2"
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
      </div>
    </section>
  );
}
