'use client'

import { useState, type ReactNode } from 'react'

interface Props {
  timelineContent: ReactNode
  mapContent: ReactNode
  hasMapData: boolean
}

export default function TripTabView({ timelineContent, mapContent, hasMapData }: Props) {
  const [tab, setTab] = useState<'timeline' | 'map'>('timeline')

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5 w-fit">
        <button
          onClick={() => setTab('timeline')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'timeline'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          🗓 Timeline
        </button>
        <button
          onClick={() => setTab('map')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'map'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          🗺️ Map
          {!hasMapData && (
            <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(no locations)</span>
          )}
        </button>
      </div>

      {tab === 'timeline' ? timelineContent : mapContent}
    </div>
  )
}
