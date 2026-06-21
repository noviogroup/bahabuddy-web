import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const script = readFileSync('scripts/verify-share-invite-remote.mjs', 'utf8')

describe('share and invite remote verifier', () => {
  test('uses live Edge Functions for share resolution and invite acceptance', () => {
    expect(script).toContain("callFunction('create-share-link'")
    expect(script).toContain("callFunction('resolve-share-link'")
    expect(script).toContain("callFunction('accept-invite'")
    expect(script).toContain('Authorization: `Bearer ${token}`')
    expect(script).toContain('apikey: anonKey')
  })

  test('creates pending invitations directly so verifier never sends email', () => {
    expect(script).toContain("service role can create pending invitation without sending email")
    expect(script).toContain(".from('trip_invitations')")
    expect(script).toContain("status: 'pending'")
    expect(script).not.toContain("callFunction('send-trip-invite'")
    expect(script).not.toContain('send-trip-invite')
  })

  test('checks public share payload sanitization and accepted collaborator reconciliation', () => {
    for (const label of [
      'resolve-share-link returns sanitized public trip snapshot',
      'accept-invite preview resolves pending invitation without writes',
      'accept-invite accept joins invitee to trip',
      'service role can verify accepted collaborator row',
      'service role can verify invitation accepted state',
      'service role can verify trip collaborator_ids includes invitee',
    ]) {
      expect(script).toContain(label)
    }

    expect(script).toContain('assertPublicShareSnapshot')
    expect(script).toContain("'booking_reference'")
    expect(script).toContain('SECRET-HOTEL-${runId}')
    expect(script).toContain('SECRET-FLIGHT-${runId}')
  })

  test('cleans verifier rows and does not print credential values', () => {
    expect(script).toContain("bb-share-${kind}-${runId}@example.invalid")
    expect(script).toContain('cleanupStaleVerifierRows')
    expect(script).toContain("await admin.from('trips').delete().in('id', uniqueTripIds)")
    expect(script).toContain("await admin.from('users').delete().in('id', uniquePublicUserIds)")
    expect(script).toContain("await admin.auth.admin.deleteUser(user.id)")
    expect(script).not.toContain('console.log(supabaseUrl')
    expect(script).not.toContain('console.log(anonKey')
    expect(script).not.toContain('console.log(serviceRoleKey')
  })
})
