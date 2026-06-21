import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { stripCustomerFacingEmoji } from '@/lib/customer-facing-text'

const SOURCE_ROOTS = ['src/app', 'src/components', 'src/lib']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])
const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)

    if (entry.name === '_archive') return []
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    if (!entry.isFile()) return []
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) return []
    if (!statSync(fullPath).isFile()) return []

    return [fullPath]
  })
}

describe('customer-facing web copy', () => {
  test('does not render emoji from app, component, or library source', () => {
    const findings = SOURCE_ROOTS
      .flatMap(collectSourceFiles)
      .flatMap((filePath) => {
        const content = readFileSync(filePath, 'utf8')

        return content
          .split('\n')
          .map((line, index) => ({ filePath, line, lineNumber: index + 1 }))
          .filter(({ line }) => EMOJI_PATTERN.test(line))
      })
      .map(({ filePath, line, lineNumber }) => `${filePath}:${lineNumber}: ${line.trim()}`)

    expect(findings).toEqual([])
  })

  test('chat prompt does not permit emoji in Buddy responses', () => {
    const chatRoute = readFileSync(path.join(process.cwd(), 'src/app/api/chat/route.ts'), 'utf8')

    expect(chatRoute).toContain('Do not use emoji in customer-facing chat responses')
    expect(chatRoute).not.toContain('One per message max')
    expect(chatRoute).not.toContain('only when it adds warmth')
  })

  test('chat sanitizer removes emoji from streamed customer-facing text', () => {
    expect(stripCustomerFacingEmoji('Beach day 🏝️ and flight ✈️')).toBe('Beach day  and flight ')
  })
})
