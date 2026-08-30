import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = join(process.cwd(), 'src')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '_archive' ? [] : sourceFiles(path)
    }
    return /\.(tsx|jsx)$/.test(entry.name) ? [path] : []
  })
}

describe('clean web UI', () => {
  it('does not use decorative dot markers in active source', () => {
    const violations = sourceFiles(SOURCE_ROOT).flatMap((path) => {
      const relativePath = path.replace(`${process.cwd()}/`, '')
      const source = readFileSync(path, 'utf8')
      const lines = source.split('\n')

      return lines.flatMap((line, index) => {
        const hasSmallHeight = /(?<![-\w])h-(?:1|1\.5|2|2\.5|3|3\.5|4|5)(?![\w.])/.test(line)
        const hasSmallWidth = /(?<![-\w])w-(?:1|1\.5|2|2\.5|3|3\.5|4|5)(?![\w.])/.test(line)
        const isSmallRoundMarker =
          (hasSmallHeight && hasSmallWidth && /rounded-full/.test(line) && /<(?:span|div)\b/.test(line))
          || /dotClass|dotColor|ACCENT_DOT|ThinkingDots|showThinkingDots/.test(line)
        const isBulletGlyph = />\s*[•●]\s*</.test(line)

        return isSmallRoundMarker || isBulletGlyph
          ? [`${relativePath}:${index + 1}: ${line.trim()}`]
          : []
      })
    })

    expect(violations).toEqual([])
  })
})
