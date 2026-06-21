'use client'

import { useRouter } from 'next/navigation'
import { TravelSearchSelect } from '@/components/marketplace/TravelSearchFields'

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
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <label htmlFor="destination-island-filter" className="whitespace-nowrap font-medium">
        Island
      </label>
      <div className="min-w-[10rem]">
        <TravelSearchSelect
          id="destination-island-filter"
          aria-label="Island"
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
          className="h-10 rounded-xl border-gray-200 px-3 py-2 text-sm font-bold"
        >
          <option value="">All islands</option>
          {islands.map((island) => (
            <option key={island} value={island}>
              {island}
            </option>
          ))}
        </TravelSearchSelect>
      </div>
    </div>
  )
}
