-- Baha Buddy web booking parity — canonical trip item reconciliation.
--
-- Web hotel and flight booking return paths need the same durable link mobile
-- uses: bookings.stripe_payment_intent_id -> trip_accommodations/trip_flights.
-- Without this, confirmation and admin views can attach the wrong trip item
-- when a trip has multiple stays or flights.

ALTER TABLE public.trip_accommodations
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_trip_accommodations_stripe_pi
  ON public.trip_accommodations(stripe_payment_intent_id);

ALTER TABLE public.trip_flights
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_trip_flights_stripe_payment_intent
  ON public.trip_flights(stripe_payment_intent_id);

ALTER TABLE public.trip_accommodations
  ALTER COLUMN status SET DEFAULT 'planned';

ALTER TABLE public.trip_accommodations
  DROP CONSTRAINT IF EXISTS trip_accommodations_status_check;

ALTER TABLE public.trip_accommodations
  ADD CONSTRAINT trip_accommodations_status_check
  CHECK (
    status IN (
      'planned',
      'prebooked',
      'pending',
      'booked',
      'failed',
      'cancelled',
      'refunded'
    )
  );

COMMENT ON COLUMN public.trip_accommodations.stripe_payment_intent_id IS
  'Stripe PaymentIntent ID for the stay checkout that produced this trip item.';

COMMENT ON COLUMN public.trip_flights.stripe_payment_intent_id IS
  'Stripe PaymentIntent ID for the flight checkout that produced this trip item.';

COMMENT ON COLUMN public.trip_accommodations.status IS
  'Canonical stay lifecycle: planned/prebooked/pending/booked/failed/cancelled/refunded.';
