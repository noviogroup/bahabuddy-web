'use client'

import { Fragment, useMemo, type ReactNode } from 'react'

import { useTripStyles } from '@/hooks/useTripStyles'
import { rankByTripStyles } from '@/lib/trip-styles'

export interface TripStyleSortedItem {
  key: string
  tripStyles?: readonly string[] | null
  priceTier?: string | null
  /** Server-rendered card. */
  node: ReactNode
}

/**
 * Renders server-built cards in server order, then (after mount) moves the
 * ones that fit the visitor's stored trip styles to the front. The page's
 * server output and caching are unchanged; only the client order differs.
 */
export default function TripStyleSortedList({
  items,
  className,
  testId,
}: {
  items: TripStyleSortedItem[]
  className?: string
  testId?: string
}) {
  const { styles } = useTripStyles()
  const ordered = useMemo(
    () => rankByTripStyles(items, styles, (item) => item),
    [items, styles],
  )
  return (
    <div className={className} data-testid={testId}>
      {ordered.map((item) => (
        <Fragment key={item.key}>{item.node}</Fragment>
      ))}
    </div>
  )
}
