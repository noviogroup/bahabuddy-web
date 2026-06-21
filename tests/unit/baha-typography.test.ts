import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const SOURCE_ROOTS = ['src/app', 'src/components', 'src/lib']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.css'])
const DEFAULT_FONT_IMPORT_PATTERN = /import\s+\{\s*(Geist|Inter|Roboto|Open_Sans|Montserrat)\s*\}\s+from\s+['"]next\/font\/google['"]/

function readProjectFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), 'utf8')
}

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)

    if (entry.name === '_archive') return []
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    if (!entry.isFile()) return []
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) return []

    return [fullPath]
  })
}

describe('Baha Buddy typography', () => {
  test('root layout wires Figtree through next/font and applies Tailwind font-sans globally', () => {
    const layout = readProjectFile('src/app/layout.tsx')

    expect(layout).toContain("import { Figtree } from 'next/font/google'")
    expect(layout).toContain('const figtree = Figtree({')
    expect(layout).toContain("variable: '--font-figtree'")
    expect(layout).toContain("display: 'swap'")
    expect(layout).toContain('<html lang="en" className={figtree.variable}>')
    expect(layout).toContain('<body className="font-sans antialiased text-charcoal bg-offwhite">')
  })

  test('Tailwind font-sans resolves through the Figtree CSS variable first', () => {
    const tailwindConfig = readProjectFile('tailwind.config.ts')

    expect(tailwindConfig).toContain('sans: ["var(--font-figtree)"')
    expect(tailwindConfig).toContain('"system-ui"')
  })

  test('customer-facing source does not import generic default Google fonts', () => {
    const findings = SOURCE_ROOTS
      .flatMap(collectSourceFiles)
      .flatMap((filePath) => {
        const content = readFileSync(filePath, 'utf8')
        const match = content.match(DEFAULT_FONT_IMPORT_PATTERN)
        return match ? [`${filePath}: imports ${match[1]} instead of Figtree`] : []
      })

    expect(findings).toEqual([])
  })
})
