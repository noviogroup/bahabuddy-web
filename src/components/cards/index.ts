/** Barrel export for the cards system. */

export { HotelCard } from './HotelCard'
export type { HotelCardData } from './HotelCard'

export { RestaurantCard } from './RestaurantCard'
export type { RestaurantCardData } from './RestaurantCard'

export { ActivityCard } from './ActivityCard'
export type { ActivityCardData } from './ActivityCard'

export { SummaryCard } from './SummaryCard'
export type { SummaryCardData, CostBreakdown } from './SummaryCard'

export { DayPlanCard } from './DayPlanCard'
export type { DayPlanCardData } from './DayPlanCard'

export { FlightCard } from './FlightCard'
export type { FlightCardData, FlightLayover } from './FlightCard'

export { DestinationCard } from './DestinationCard'
export type { DestinationCardData } from './DestinationCard'

export { MapCard } from './MapCard'
export type { MapCardData, MapLocation, MapLocationType } from './MapCard'

// Shared atoms — re-exported for use outside chat (e.g. on /hotels list pages,
// in trip summaries, in detail page headers).
export * from './shared'
