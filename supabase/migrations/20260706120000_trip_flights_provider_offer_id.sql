DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_flights'
      AND column_name = 'duffel_offer_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_flights'
      AND column_name = 'provider_offer_id'
  ) THEN
    ALTER TABLE public.trip_flights
      RENAME COLUMN duffel_offer_id TO provider_offer_id;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_flights'
      AND column_name = 'duffel_offer_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_flights'
      AND column_name = 'provider_offer_id'
  ) THEN
    UPDATE public.trip_flights
    SET provider_offer_id = COALESCE(provider_offer_id, duffel_offer_id);

    ALTER TABLE public.trip_flights
      DROP COLUMN duffel_offer_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_flights'
      AND column_name = 'provider_offer_id'
  ) THEN
    COMMENT ON COLUMN public.trip_flights.provider_offer_id IS
      'Normalized active flight provider offer ID used for LiteAPI search, prebook, and booking reconciliation.';
  END IF;
END $$;
