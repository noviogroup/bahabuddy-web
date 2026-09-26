import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BahaImages, DestinationFallbackImages } from '@/lib/baha-images'
import { tourismPartnerImageList } from '@/lib/tourism-partner-images'

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === '_archive' ? [] : sourceFiles(path)
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [path] : []
  })
}

describe('local tourism-partner imagery', () => {
  it('retains all 53 labeled delivery assets', () => {
    expect(tourismPartnerImageList).toHaveLength(53)
    expect(new Set(tourismPartnerImageList.map((asset) => asset.src))).toHaveLength(53)

    for (const asset of tourismPartnerImageList) {
      expect(asset.src).toMatch(/^\/assets\/tourism-partner\/.+\.webp$/)
      expect(asset.label.trim()).not.toBe('')
      expect(asset.alt.trim()).not.toBe('')
      expect(asset.sourceAsset.trim()).not.toBe('')
      expect(asset.scope.trim()).not.toBe('')

      const localPath = join(process.cwd(), 'public', asset.src.replace(/^\//, ''))
      expect(existsSync(localPath), asset.src).toBe(true)
      expect(statSync(localPath).size, asset.src).toBeGreaterThan(1_000)
    }
  })

  it('uses local partner files for the mapped island and homepage fallbacks', () => {
    for (const src of [
      DestinationFallbackImages.islandFinderHero,
      DestinationFallbackImages.nassauParadiseIsland,
      DestinationFallbackImages.exumas,
      DestinationFallbackImages.eleuthera,
      DestinationFallbackImages.andros,
      DestinationFallbackImages.bimini,
      DestinationFallbackImages.grandBahama,
      DestinationFallbackImages.longIsland,
      DestinationFallbackImages.catIsland,
      DestinationFallbackImages.berryIslands,
      DestinationFallbackImages.rumCay,
      DestinationFallbackImages.mayaguana,
      DestinationFallbackImages.acklinsCrookedIsland,
      BahaImages.travelerPlanning,
      BahaImages.travelerHere,
      BahaImages.categoryStays,
      BahaImages.categoryThingsToDo,
      BahaImages.categoryRestaurants,
      BahaImages.categoryEvents,
      BahaImages.diving,
    ]) {
      expect(src).toMatch(/^\/assets\/tourism-partner\//)
    }
  })

  it('contains no active portal hotlinks or generated destination-image dependency', () => {
    const activeSource = sourceFiles(join(process.cwd(), 'src'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')

    expect(activeSource).not.toMatch(/(?:front\.travpromobile\.com|travprocdn\.imgix\.net)/)
    expect(activeSource).not.toContain('/assets/destinations/generated/')
    expect(existsSync(join(process.cwd(), 'public/assets/destinations/generated'))).toBe(false)
  })
})
