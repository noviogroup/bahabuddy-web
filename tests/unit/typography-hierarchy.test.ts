import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const uiRoots = ['src/app', 'src/components']
const activeExtensions = new Set(['.css', '.ts', '.tsx'])

function collectUiFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const absolutePath = path.join(dir, entry)
    if (absolutePath.includes(`${path.sep}_archive${path.sep}`)) return []
    const stats = statSync(absolutePath)
    if (stats.isDirectory()) return collectUiFiles(absolutePath)
    return activeExtensions.has(path.extname(entry)) ? [absolutePath] : []
  })
}

describe('site typography hierarchy', () => {
  test('keeps active web UI on the clean Figtree hierarchy rules', () => {
    const projectRoot = process.cwd()
    const files = uiRoots.flatMap((root) => collectUiFiles(path.join(projectRoot, root)))
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const relative = path.relative(projectRoot, file)
      const matches = [
        ...source.matchAll(/tracking-(?:tighter|tight|normal|wide|wider|widest|\[[^\]]+\])/g),
        ...source.matchAll(/font-extrabold/g),
        ...source.matchAll(/(?:sm|md|lg|xl|2xl|min-\[[^\]]+\]|max-\[[^\]]+\]):text-(?:\[[^\]]+\]|[0-9]xl|xs|sm|base|lg|xl)/g),
        ...source.matchAll(/text-\[[^\]]+\]/g),
        ...source.matchAll(/letter-spacing/g),
      ]

      return matches.map((match) => `${relative}: ${match[0]}`)
    })

    expect(violations).toEqual([])
  })

  test('keeps the flight booking surface from making every control bold', () => {
    const projectRoot = process.cwd()
    const files = [
      'src/app/(dashboard)/flights/FlightSearchClient.tsx',
      'src/components/cards/FlightCard.tsx',
      'src/components/RichCards.tsx',
      'src/components/TravelOriginPrompt.tsx',
      'src/components/marketplace/CompactPageHeader.tsx',
      'src/components/marketplace/MarketplacePublicHeader.tsx',
      'src/components/marketplace/ResultFilterPanel.tsx',
      'src/components/marketplace/TravelSearchCombobox.tsx',
      'src/components/marketplace/TravelSearchFields.tsx',
      'src/components/ui/date/BahaDatePicker.tsx',
    ]

    const violations = files.flatMap((relative) => {
      const source = readFileSync(path.join(projectRoot, relative), 'utf8')
      return source.split('\n').flatMap((line, index) => {
        if (!line.includes('font-bold')) return []
        const allowed =
          /<h[1-3]\b/.test(line)
          || line.includes('{formattedPrice}')

        return allowed ? [] : [`${relative}:${index + 1}: ${line.trim()}`]
      })
    })

    expect(violations).toEqual([])
  })
})
