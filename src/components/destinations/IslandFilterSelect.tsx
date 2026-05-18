'use client'

import { useRouter } from 'next/navigation'

interface IslandFilterSelectProps {
  islands: string[]
  activeIsland: string
  activeCategory: string
}

/**
 * Island dropdown for /destinations — client-only because onChange
 * handlers cannot live in the page Server Component.
 */
export default function IslandFilterSelect({
  islands,
  activeIsland,
  activeCategory,
}: IslandFilterSelectProps) {
  const router = useRouter()

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="font-medium whitespace-nowrap">Island</span>
      <select
        value={activeIsland}
        onChange={(e) => {
          const island = e.target.value
          const params = new URLSearchParams()
          if (activeCategory && activeCategory !== 'All') {
            params.set('category', activeCategory)
          }
          if (island) params.set('island', island)
          const qs = params.toString()
          router.push(qs ? `/destinations?${qs}` : '/destinations')
        }}
        className="rounded-baha-md border border-gray-300 bg-white px-3 py-2 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 min-w-[10rem]"
      >
        <option value="">All islands</option>
        {islands.map((island) => (
          <option key={island} value={island}>
            {island}
          </option>
        ))}
      </select>
    </label>
  )
}
