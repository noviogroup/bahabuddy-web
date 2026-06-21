# Web Public Nav, Logo, And Readiness Review - June 21, 2026

Review time: June 21, 2026
Scope: public marketplace header, footer navigation, logo treatment, and launch-readiness language

## What Changed

- Removed `Guides` from the primary public product navigation.
- Kept `Guides` in the footer travel-products sitemap and crawler sitemap.
- Kept `Restaurants` off the main nav.
- Preserved primary public nav around traveler actions:
  - Stays
  - Flights
  - Explore
  - Destinations
  - Deals
  - Concierge
- Reconfirmed the logo contract:
  - header uses `/brand/baha-logo-mark.svg`
  - no wrapper border
  - no gradient plate
  - no shadow
  - no rounded background shell

## Why

The site should not have pages in the top nav just because routes exist. The primary nav is for commerce and traveler decision paths. Editorial and utility pages still matter, but they belong in Explore, footer, sitemap, and contextual cards.

## Launch Position

Public web is validation-ready for the current UI/booking slice, not fully launch-approved. The broader launch decision still depends on:

- live LiteAPI hotel booking lifecycle
- live LiteAPI flight booking lifecycle
- Stripe/webhook reconciliation
- canonical `bookings` rows appearing in Admin
- `trips` RLS hardening
- visual QA across public web, authenticated web, admin, and mobile
- production secrets and provider configuration review

## Verification Target

Run from `bahabuddy-web`:

```bash
npm run lint
npm test
npm run build
```

The focused public shell test should verify that the top nav excludes `Guides`, the footer still includes it, and the logo has no plate-style classes.
