import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260621120000_trips_rls_launch_gate.sql',
  'utf8',
)

describe('trips RLS launch gate migration', () => {
  test('enables trips RLS without forcing service-role paths yet', () => {
    expect(migration).toContain('ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;')
    expect(migration).toContain('ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;')
    expect(migration).toContain('ALTER TABLE public.trips NO FORCE ROW LEVEL SECURITY;')
    expect(migration).not.toContain('ALTER TABLE public.trips FORCE ROW LEVEL SECURITY;')
  })

  test('keeps recursion-safe trip helper functions callable by app roles', () => {
    for (const helper of ['is_trip_owner', 'is_trip_collaborator', 'is_trip_editor']) {
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${helper}(uuid) TO anon;`)
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${helper}(uuid) TO authenticated;`)
    }
  })

  test('fails migration when required owner and collaborator policies are missing', () => {
    for (const policy of [
      'Users can read own or collaborated trips',
      'Users can insert own trips',
      'Users can update own trips',
      'Users can delete own trips',
      'Users can read collaborators for own trips or where they are collaborator',
      'Trip owners can insert collaborators',
      'Trip owners can update collaborators',
      'Trip owners can delete collaborators',
    ]) {
      expect(migration).toContain(policy)
    }

    expect(migration).toContain('Missing trip RLS policies')
  })

  test('audits table state and SECURITY DEFINER helpers at migration time', () => {
    expect(migration).toContain("'public.trips'::regclass")
    expect(migration).toContain('relrowsecurity')
    expect(migration).toContain('relforcerowsecurity')
    expect(migration).toContain('fn.prosecdef IS TRUE')
    expect(migration).toContain('Missing SECURITY DEFINER trip RLS helper functions')
  })
})
