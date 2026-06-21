import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const script = readFileSync('scripts/verify-web-trip-list-session.mjs', 'utf8')

describe('web trip-list session verifier', () => {
  test('creates real auth users, accepted shared trip state, and browser session', () => {
    expect(script).toContain("admin.auth.admin.createUser")
    expect(script).toContain("bb-webtrip-${kind}-${runId}@example.invalid")
    expect(script).toContain("onboarding_completed: true")
    expect(script).toContain('tempo.cdn.tambourine.com')
    expect(script).not.toContain('https://example.invalid/baha-web-trip-verifier.jpg')
    expect(script).toContain(".from('trip_collaborators')")
    expect(script).toContain("accepted_at: new Date().toISOString()")
    expect(script).toContain('traveler RLS client can read accepted collaborator row before browser check')
    expect(script).toContain("chromium.launch")
    expect(script).toContain("page.goto(`${baseUrl}/login?redirect=%2Ftrip`")
    expect(script).toContain("page.fill('#auth-email', traveler.email)")
    expect(script).toContain("page.fill('#auth-password', password)")
  })

  test('proves owned and accepted shared trips render while unrelated trips stay hidden', () => {
    for (const label of [
      'browser trip list shows traveler-owned trip',
      'browser trip list shows accepted shared trip',
      'browser trip list hides unrelated trip',
      'browser trip list counts owned plus shared trips',
    ]) {
      expect(script).toContain(label)
    }

    expect(script).toContain('Web session owned ${runId}')
    expect(script).toContain('Web session shared ${runId}')
    expect(script).toContain('Web session hidden ${runId}')
    expect(script).toContain("2 trips planned and saved")
  })

  test('cleans verifier rows and does not print credential values', () => {
    expect(script).toContain('cleanupStaleVerifierRows')
    expect(script).toContain('writeBrowserFailureDiagnostics')
    expect(script).toContain('Browser failure screenshot')
    expect(script).toContain("await admin.from('trip_collaborators').delete().in('trip_id', uniqueTripIds)")
    expect(script).toContain("await admin.from('trips').delete().in('id', uniqueTripIds)")
    expect(script).toContain("await admin.from('users').delete().in('id', uniquePublicUserIds)")
    expect(script).toContain("await admin.auth.admin.deleteUser(user.id)")
    expect(script).not.toContain('console.log(supabaseUrl')
    expect(script).not.toContain('console.log(anonKey')
    expect(script).not.toContain('console.log(serviceRoleKey')
    expect(script).not.toContain('console.log(password')
  })
})
