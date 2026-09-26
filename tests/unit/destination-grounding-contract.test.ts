import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { TOOL_DEFINITIONS } from '@/lib/chat-tools'
import { BUDDY_GROUNDING_POLICY, BUDDY_GROUNDING_POLICY_VERSION } from '@/lib/buddy-grounding-policy'
import { DESTINATION_GOLDEN_SET, GOLDEN_ISLANDS } from '../fixtures/destination-golden-set'

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

  it('keeps the web runtime and any sibling mobile runtime free of hardcoded destination knowledge', () => {
    const workspaceRoot = path.resolve(process.cwd(), '..')
    const sources = [fs.readFileSync(path.join(process.cwd(), 'src/lib/chat-tools.ts'), 'utf8')]
    const mobileToolsPath = path.join(workspaceRoot, 'Baha-Buddy-V2/supabase/functions/claude-chat-proxy/tools.ts')
    if (fs.existsSync(mobileToolsPath)) sources.push(fs.readFileSync(mobileToolsPath, 'utf8'))

    for (const source of sources) {
      expect(source).not.toContain('ISLAND_INFO')
      expect(source).not.toContain('get_island_info')
      expect(source).toContain('search_destination_knowledge')
    }
  })

  it('keeps the web and any sibling mobile grounding policy on the canonical artifact version', () => {
    const canonical = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/ai/buddy-grounding-policy.json'), 'utf8'))
    expect(BUDDY_GROUNDING_POLICY_VERSION).toBe(canonical.version)
    expect(BUDDY_GROUNDING_POLICY).toBe(canonical.policy)

    const mobileArtifactPath = path.resolve(process.cwd(), '../Baha-Buddy-V2/supabase/functions/_shared/buddy_grounding_policy.ts')
    if (fs.existsSync(mobileArtifactPath)) {
      const mobileArtifact = fs.readFileSync(mobileArtifactPath, 'utf8')
      expect(mobileArtifact).toContain(`BUDDY_GROUNDING_POLICY_VERSION = '${canonical.version}'`)
      expect(mobileArtifact).toContain(canonical.policy)
    }
  })
})
