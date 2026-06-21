'use client'

/**
 * TripTabView — switches between Timeline / Map / Budget views on the
 * trip detail page.
 *
 * C.2 update: internals now use <SegmentedToggle> for the tab UI,
 * matching the segmented toggle used in Explore and the mobile My Trip
 * screen. The public API (timelineContent / mapContent / budgetContent
 * / hasMapData props) is unchanged — callers don't need to update.
 *
 * Mobile reference: my_trip_screen.dart uses a segmented control with
 * the same three tabs.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { SegmentedToggle } from '@/components/ui'

interface Props {
  timelineContent: ReactNode
  mapContent: ReactNode
  budgetContent: ReactNode
  hasMapData: boolean
}

type Tab = 'timeline' | 'map' | 'budget'

export default function TripTabView({
  timelineContent,
  mapContent,
  budgetContent,
  hasMapData,
}: Props) {
  const [tab, setTab] = useState<Tab>('timeline')

  useEffect(() => {
    function syncHash() {
      const next = window.location.hash.replace('#', '')
      if (next === 'timeline' || next === 'map' || next === 'budget') {
        setTab(next)
      }
    }

    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  return (
    <div id={tab}>
      <div className="mb-5">
        <SegmentedToggle<Tab>
          value={tab}
          onChange={setTab}
          aria-label="Trip view"
          options={[
            {
              value: 'timeline',
              label: 'Timeline',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              value: 'map',
              label: hasMapData ? 'Map' : (
                <span className="inline-flex items-baseline gap-1">
                  Map
                  <span className="text-[10px] font-normal opacity-60">(empty)</span>
                </span>
              ),
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0022 18.882V8.118a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              ),
            },
            {
              value: 'budget',
              label: 'Budget',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ]}
        />
      </div>

      {tab === 'timeline' && timelineContent}
      {tab === 'map' && mapContent}
      {tab === 'budget' && budgetContent}
    </div>
  )
}
