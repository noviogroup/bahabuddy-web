import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/app/explore/island/[id]/page.tsx'),
  'utf8',
)

describe('destination media policy', () => {
  it('does not fall back to legacy database media after an approved Sanity profile resolves', () => {
    expect(source).toContain('const heroUrl = sanity ? sanity.imageUrl : dbHero;')
    expect(source).toContain('const gallery = sanity\n    ? sanityGallery')
    expect(source).not.toContain('sanity?.imageUrl ?? dbHero')
    expect(source).not.toContain('[...sanityGallery, ...galleryImages]')
  })
})
