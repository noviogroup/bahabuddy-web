import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { TOOL_DEFINITIONS } from '@/lib/chat-tools'
import { BUDDY_GROUNDING_POLICY, BUDDY_GROUNDING_POLICY_VERSION } from '@/lib/buddy-grounding-policy'
import { DESTINATION_GOLDEN_SET, GOLDEN_ISLANDS } from '../fixtures/destination-golden-set'

const workspaceRoot = path.resolve(
  process.env.BAHA_BUDDY_WORKSPACE_ROOT ?? path.join(process.cwd(), '..'),
)
const mobileToolsPath = path.join(
  workspaceRoot,
  'Baha-Buddy-V2/supabase/functions/claude-chat-proxy/tools.ts',
)
const mobilePolicyPath = path.join(
  workspaceRoot,
  'Baha-Buddy-V2/supabase/functions/_shared/buddy_grounding_policy.ts',
)
const canonicalPolicyPath = path.join(workspaceRoot, 'docs/ai/buddy-grounding-policy.json')
const hasFullWorkspace = [mobileToolsPath, mobilePolicyPath, canonicalPolicyPath].every(fs.existsSync)
const crossWorkspaceIt = hasFullWorkspace ? it : it.skip

describe('all-island grounded destination contract', () => {
  it('contains 320 unique cases across all 16 canonical island groups', () => {
    expect(GOLDEN_ISLANDS).toHaveLength(16)
    expect(DESTINATION_GOLDEN_SET).toHaveLength(320)
    expect(new Set(DESTINATION_GOLDEN_SET.map((item) => item.id)).size).toBe(320)
    for (const [slug] of GOLDEN_ISLANDS) {
      expect(DESTINATION_GOLDEN_SET.filter((item) => item.islandSlug === slug)).toHaveLength(20)
    }
  })

  it('contains explicit Dean’s Blue Hole wrong-island regressions', () => {
    const cases = DESTINATION_GOLDEN_SET.filter((item) => item.question.includes("Dean's Blue Hole"))
    expect(cases).toHaveLength(2)
    expect(cases.every((item) => item.requiredCanonicalIsland === 'long-island')).toBe(true)
    expect(cases.some((item) => item.mustRefuteWrongIsland)).toBe(true)
  })

  it('exposes the shared grounded tool and no legacy island-info tool', () => {
    const names = TOOL_DEFINITIONS.map((tool) => tool.name)
    expect(names).toContain('get_destination_context')
    expect(names).not.toContain('get_island_info')
  })

  it('does not retain hardcoded destination knowledge objects in the web runtime', () => {
    const webTools = fs.readFileSync(path.join(process.cwd(), 'src/lib/chat-tools.ts'), 'utf8')
    expect(webTools).not.toContain('ISLAND_INFO')
    expect(webTools).not.toContain('get_island_info')
    expect(webTools).toContain('search_destination_knowledge')
  })

  it('ships a versioned web grounding policy', () => {
    expect(BUDDY_GROUNDING_POLICY_VERSION).toMatch(/^[a-z0-9][a-z0-9._-]+$/i)
    expect(BUDDY_GROUNDING_POLICY.length).toBeGreaterThan(100)
  })

  crossWorkspaceIt('does not retain hardcoded destination knowledge objects in the mobile runtime', () => {
    const mobileTools = fs.readFileSync(mobileToolsPath, 'utf8')
    expect(mobileTools).not.toContain('ISLAND_INFO')
    expect(mobileTools).not.toContain('get_island_info')
    expect(mobileTools).toContain('search_destination_knowledge')
  })

  crossWorkspaceIt('keeps the web and mobile grounding policy on the canonical artifact version', () => {
    const canonical = JSON.parse(fs.readFileSync(canonicalPolicyPath, 'utf8'))
    const mobileArtifact = fs.readFileSync(mobilePolicyPath, 'utf8')
    expect(BUDDY_GROUNDING_POLICY_VERSION).toBe(canonical.version)
    expect(BUDDY_GROUNDING_POLICY).toBe(canonical.policy)
    expect(mobileArtifact).toContain(`BUDDY_GROUNDING_POLICY_VERSION = '${canonical.version}'`)
    expect(mobileArtifact).toContain(canonical.policy)
  })
})
