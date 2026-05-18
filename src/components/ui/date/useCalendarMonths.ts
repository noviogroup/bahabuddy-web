'use client'

import { useEffect, useState } from 'react'

/** 2 months on sm+ screens, 1 on mobile — Airbnb-style dual calendar on desktop. */
export function useCalendarMonths(preferred = 2): number {
  const [months, setMonths] = useState(1)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setMonths(mq.matches ? preferred : 1)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [preferred])

  return months
}
