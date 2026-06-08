# Guided Day Web Experience

This document defines the web work for Baha Buddy's one-day guided visitor plans.

## Web routes

Recommended routes:

- `/nassau-cruise-day-planner`
- `/nassau-cruise-itineraries`
- `/nassau-cruise-itineraries/[slug]`
- `/build-my-cruise-day`
- `/my-itinerary/[id]`

## Web experience

### Landing page

Explain the one-day planning product, pricing, and return-time value.

### Listing page

Show plan cards with duration, budget, mobility level, interests, price, and start CTA.

### Detail page

Show hero, timeline, map preview, stops, cost notes, time buffer, upgrade options, and start guide CTA.

### Checkout / order capture

Capture selected plan, tier, ship name, arrival time, departure time, all-aboard time, group size, interests, and payment status.

### My itinerary page

Show the purchased plan, timeline, map links, and a prompt to continue in the mobile app for full guide mode.

## Data sources

Use these Supabase records:

- `published_cruise_itineraries`
- `cruise_itinerary_detail`
- `cruise_day_orders`
- `cruise_feed_items`

## Build order

1. Add listing page.
2. Add detail page from Supabase view.
3. Add build-my-day form.
4. Add checkout handoff.
5. Add purchased itinerary page.
6. Add app handoff CTA for full live guide.
