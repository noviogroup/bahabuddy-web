-- enable_trip_realtime.sql
--
-- Pending P0 — run this in the Supabase SQL Editor to activate Realtime
-- subscriptions for the Trip view's auto-refresh feature.
--
-- Without this, the page still works fine — useTripRealtime() just won't
-- fire when backend data changes. With this, the Trip view auto-refreshes
-- in real time when the chat AI adds activities, the booking webhook
-- updates a flight, or the trip status flips draft → planned → booked.
--
-- Idempotent: re-running is safe (Postgres will no-op if the table is
-- already in the publication).
--
-- Project: cxcfymhoncysyloutvkh

ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_flights;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_accommodations;

-- Verify (should return 4 rows):
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('trips', 'trip_activities', 'trip_flights', 'trip_accommodations');
