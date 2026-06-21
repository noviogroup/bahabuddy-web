-- Baha Buddy web launch gate — enforce trips RLS before broad beta.
--
-- Earlier migrations define the owner/collaborator policies and recursion-safe
-- helper functions. Production inventory later showed public.trips with RLS
-- disabled, so this migration turns the table-level switch back on and fails
-- loudly if the expected policy surface is missing.

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Do not FORCE RLS yet. Admin and booking operations still rely on service-role
-- server clients, and the current enablement plan calls for force only after
-- web, mobile, admin, Edge Function, share, and invite flows are verified.
ALTER TABLE public.trips NO FORCE ROW LEVEL SECURITY;

GRANT EXECUTE ON FUNCTION public.is_trip_owner(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_trip_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_collaborator(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_trip_collaborator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_editor(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_trip_editor(uuid) TO authenticated;

COMMENT ON TABLE public.trips IS
  'User-owned trip records. RLS must remain enabled before public beta; owners can manage trips and accepted collaborators can read shared trips.';

DO $$
DECLARE
  missing_policies text[];
  missing_functions text[];
  trips_rls_enabled boolean;
  trips_force_rls boolean;
BEGIN
  SELECT c.relrowsecurity, c.relforcerowsecurity
  INTO trips_rls_enabled, trips_force_rls
  FROM pg_class c
  WHERE c.oid = 'public.trips'::regclass;

  IF trips_rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'public.trips RLS must be enabled before launch';
  END IF;

  IF trips_force_rls IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'public.trips FORCE RLS must remain disabled until the controlled force-RLS validation window';
  END IF;

  SELECT array_agg(format('%s.%s', table_name, policy_name) ORDER BY table_name, policy_name)
  INTO missing_policies
  FROM (
    VALUES
      ('trips', 'Users can read own or collaborated trips'),
      ('trips', 'Users can insert own trips'),
      ('trips', 'Users can update own trips'),
      ('trips', 'Users can delete own trips'),
      ('trip_collaborators', 'Users can read collaborators for own trips or where they are collaborator'),
      ('trip_collaborators', 'Trip owners can insert collaborators'),
      ('trip_collaborators', 'Trip owners can update collaborators'),
      ('trip_collaborators', 'Trip owners can delete collaborators')
  ) AS required(table_name, policy_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = required.table_name
      -- PostgreSQL stores policy names as identifiers, so long names can be
      -- truncated to 63 bytes even when the source migration used the full
      -- string. Accept both the source name and the stored identifier form.
      AND p.policyname IN (required.policy_name, left(required.policy_name, 63))
  );

  IF missing_policies IS NOT NULL THEN
    RAISE EXCEPTION 'Missing trip RLS policies: %', array_to_string(missing_policies, ', ');
  END IF;

  SELECT array_agg(function_name ORDER BY function_name)
  INTO missing_functions
  FROM (
    VALUES
      ('is_trip_owner'),
      ('is_trip_collaborator'),
      ('is_trip_editor')
  ) AS required(function_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc fn
    JOIN pg_namespace ns ON ns.oid = fn.pronamespace
    WHERE ns.nspname = 'public'
      AND fn.proname = required.function_name
      AND fn.prosecdef IS TRUE
  );

  IF missing_functions IS NOT NULL THEN
    RAISE EXCEPTION 'Missing SECURITY DEFINER trip RLS helper functions: %', array_to_string(missing_functions, ', ');
  END IF;
END $$;
