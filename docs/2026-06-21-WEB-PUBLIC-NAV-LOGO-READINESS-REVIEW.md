# Web Public Nav, Logo, And Readiness Review - June 21, 2026

Review time: June 21, 2026
Updated: June 21, 2026, 12:05 EDT
Scope: public marketplace header, footer navigation, logo treatment, and launch-readiness language

## What Changed

- Preserved primary public nav around traveler actions:
  - Stays
  - Flights
  - Explore
  - Destinations
  - Guides
  - Deals
  - Concierge
- Kept `Restaurants` off the main nav.
- Added intent-first dropdown ownership under `Explore`:
  - Explore home
  - Things to do
  - Landmarks
  - Restaurants and food
  - Beaches
  - Tours
  - Culture
  - Hotels and stays
  - Island access
- Added island-picker dropdown ownership under `Destinations`:
  - canonical island detail links for the current built island pages
  - filtered destination links for additional family islands that do not yet have guaranteed island detail pages
- Updated active nav behavior so `/restaurants` highlights `Explore`, while `/explore/island/...` highlights `Destinations`.
- Reconfirmed the logo contract:
  - header uses `/brand/baha-logo-mark.svg`
  - no wrapper border
  - no gradient plate
  - no shadow
  - no rounded background shell

## Why

The site should not have pages in the top nav just because routes exist. The primary nav is for commerce and traveler decision paths. Editorial pages belong in the top nav only when they directly support trip planning. `Guides` now stays in primary nav because it supports pre-account planning. Restaurants remain contextual because they are part of Explore, island pages, destination browsing, guides, place cards, and Buddy planning context.

The dropdown split is deliberate:

- `Explore` answers “what do I want to do?”
- `Destinations` answers “which island am I considering?”

## Launch Position

Public web is validation-ready for the current UI/booking slice, not fully launch-approved. The broader launch decision still depends on:

- live LiteAPI hotel booking lifecycle
- live LiteAPI flight booking lifecycle
- Stripe/webhook reconciliation
- canonical `bookings` rows appearing in Admin
- `trips` RLS hardening
- visual QA across public web, authenticated web, admin, and mobile
- production secrets and provider configuration review

## Verification

Run from `bahabuddy-web`:

```bash
npm run lint
npm test
npm run build
```

The focused public shell test should verify that the top nav includes `Guides`, excludes `Restaurants` as a primary tab, exposes Explore and Destinations dropdown ownership, and keeps the logo free of plate-style classes.

Current follow-up validation on June 21, 2026 at 18:25 EDT passed with focused public-shell assertions, full `npm run test` with 85 files and 350 tests, `npm run lint`, and `npm run build`. The public shell test now asserts the current dropdown copy, including `Restaurants and food` and `Tours and activities`.
