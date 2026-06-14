# Booking Integration Overview

Baha Buddy now has a live travel booking provider connection.

All customer apps should use Baha Buddy backend routes instead of direct provider calls.

## Rollout

1. Build the server-side connector.
2. Add shared records in Supabase.
3. Launch hotel discovery first.
4. Add confirmed hotel reservations.
5. Add dashboard and admin visibility.
6. Add air travel after hotel flow is stable.
7. Connect reservations to Concierge orders.

## Admin

Admin should show reservation status, traveler, source, linked Concierge order, and support notes.

## Customer Experience

Booking entry points should appear in Buddy chat, trip dashboard, Concierge, itinerary pages, and travel landing pages.
