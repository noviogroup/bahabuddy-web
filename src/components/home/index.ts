/**
 * Home Dashboard widgets.
 *
 * Source of truth: Baha-Buddy-V2/lib/features/home/widgets/*.dart
 *                  Baha-Buddy-V2/lib/features/home/screens/home_screen.dart
 *
 * Import:
 *   import {
 *     GreetingStrip,
 *     IslandExplorerRow,
 *     AdaptiveHeroCard,
 *     QuickActionsRow,
 *     HomeCardCarousel,
 *     BuddyPickCard,
 *     WeatherGlanceCard,
 *     TravelTipCard,
 *     MobileChatEntryBar,
 *   } from '@/components/home'
 */

export { default as GreetingStrip }       from './GreetingStrip'
export { default as IslandExplorerRow }   from './IslandExplorerRow'
export { default as AdaptiveHeroCard }    from './AdaptiveHeroCard'
export { default as HeroSearchPanel }     from './HeroSearchPanel'
export { default as QuickActionsRow }     from './QuickActionsRow'
export { default as HomeCardCarousel }    from './HomeCardCarousel'
export { default as BuddyPickCard }       from './BuddyPickCard'
export { default as WeatherGlanceCard }   from './WeatherGlanceCard'
export { default as TravelTipCard }       from './TravelTipCard'
export { default as MobileChatEntryBar }  from './MobileChatEntryBar'

export type { GreetingStripProps }     from './GreetingStrip'
export type { AdaptiveHeroCardProps } from './AdaptiveHeroCard'
export type { HomeCardCarouselProps }  from './HomeCardCarousel'
export type { UserState } from '@/lib/derive-user-state'

export { deriveUserState } from '@/lib/derive-user-state'
