-- Historical compatibility column from the retired flight-provider schema.
-- Current flight flows use LiteAPI/Nuitee and the provider-neutral
-- `provider_offer_id` column added by the coordinated 20260706120000 migration.
ALTER TABLE public.trip_flights
  ADD COLUMN IF NOT EXISTS duffel_offer_id text;

COMMENT ON COLUMN public.trip_flights.duffel_offer_id IS 'Historical flight-provider compatibility column. Current flows use provider_offer_id after the coordinated migration.';
