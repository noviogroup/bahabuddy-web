import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const script = readFileSync('scripts/verify-trips-rls-remote.mjs', 'utf8')

describe('trips RLS remote verifier', () => {
  test('uses anon sessions for behavioral RLS checks and service role for setup only', () => {
    expect(script).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(script).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(script).toContain('signInWithPassword')
    expect(script).toContain('Authorization: `Bearer ${data.session.access_token}`')
    expect(script).toContain("admin.auth.admin.createUser")
    expect(script).toContain("admin.auth.admin.deleteUser")
  })

  test('covers owner, non-owner, collaborator, editor, service-role, and cleanup behavior', () => {
    for (const label of [
      'owner can insert own trip',
      'owner can read own trip',
      'owner can update own trip',
      'non-owner cannot read trip by direct id',
      'non-owner cannot update trip by direct id',
      'service role can read trip for admin/support paths',
      'owner can add accepted editor collaborator',
      'accepted collaborator can read shared trip',
      'editor collaborator can write supported trip activity item',
      'owner can delete own trip',
    ]) {
      expect(script).toContain(label)
    }

    expect(script).toContain("bb-rls-${kind}-${runId}@example.invalid")
    expect(script).toContain('service role can upsert ${kind} public profile')
    expect(script).toContain('cleanupStaleVerifierRows')
    expect(script).toContain("await admin.from('trips').delete().in('id', uniqueTripIds)")
    expect(script).toContain("await admin.from('users').delete().in('id', uniquePublicUserIds)")
    expect(script).toContain("like('email', 'bb-rls-%@example.invalid')")
  })

  test('does not print credential values', () => {
    expect(script).not.toContain('console.log(supabaseUrl')
    expect(script).not.toContain('console.log(anonKey')
    expect(script).not.toContain('console.log(serviceRoleKey')
  })
})
