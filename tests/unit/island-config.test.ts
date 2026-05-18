import { describe, test, expect } from 'vitest';

import {
  ISLAND_CONFIGS,
  getIslandConfig,
  getIslandDbSlug,
  getIslandHeroImage,
} from '@/lib/island-config';
import { BahaImages } from '@/lib/baha-images';

/**
 * Tests for island-config.
 *
 * ISLAND_CONFIGS is the canonical catalog joining web routes, mobile,
 * Sanity, and Supabase records. Drift between any two of those breaks
 * island-detail pages in subtle ways:
 *
 *   • Duplicate slugs → router conflict, last-wins
 *   • Bad dbSlug → Supabase query returns empty results
 *   • Bad heroImageKey → broken hero image, fails LCP
 *
 * The catalog invariants below are the closest thing to a "schema"
 * we have for this file.
 */

describe('ISLAND_CONFIGS — catalog invariants', () => {
  test('the catalog is non-empty', () => {
    expect(ISLAND_CONFIGS.length).toBeGreaterThan(0);
  });

  test('every slug is unique', () => {
    const slugs = ISLAND_CONFIGS.map((c) => c.slug);
    const set = new Set(slugs);
    expect(set.size).toBe(slugs.length);
  });

  test('every slug is URL-safe (lowercase + hyphens only)', () => {
    for (const cfg of ISLAND_CONFIGS) {
      expect(cfg.slug, `bad slug: "${cfg.slug}"`).toMatch(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      );
    }
  });

  test('every dbSlug override points to a real sibling slug in the catalog', () => {
    // Critical: paradise-island.dbSlug='nassau-paradise-island' must
    // exist as another row's `slug`, otherwise the Supabase query
    // returns zero rows.
    const allSlugs = new Set(ISLAND_CONFIGS.map((c) => c.slug));
    for (const cfg of ISLAND_CONFIGS) {
      if (cfg.dbSlug) {
        expect(
          allSlugs.has(cfg.dbSlug),
          `${cfg.slug} has dbSlug "${cfg.dbSlug}" which does not exist as a sibling slug`,
        ).toBe(true);
      }
    }
  });

  test('every heroImageKey resolves to a non-empty URL in BahaImages', () => {
    for (const cfg of ISLAND_CONFIGS) {
      const url = BahaImages[cfg.heroImageKey];
      expect(
        typeof url === 'string' && url.length > 0,
        `${cfg.slug}: heroImageKey "${String(cfg.heroImageKey)}" did not resolve to a URL`,
      ).toBe(true);
    }
  });

  test('required editorial fields are non-empty strings', () => {
    for (const cfg of ISLAND_CONFIGS) {
      for (const field of [
        'name',
        'tagline',
        'bestTime',
        'vibe',
        'tripLength',
        'description',
      ] as const) {
        expect(
          typeof cfg[field] === 'string' && cfg[field].length > 0,
          `${cfg.slug}: "${field}" is empty`,
        ).toBe(true);
      }
    }
  });

  test('every catalog entry has a description that fits in 2 paragraphs', () => {
    // Soft cap — descriptions drive SEO + above-the-fold detail pages.
    // Anything longer than ~800 chars suggests the entry needs
    // condensing.
    for (const cfg of ISLAND_CONFIGS) {
      expect(
        cfg.description.length,
        `${cfg.slug}: description too long (${cfg.description.length} chars)`,
      ).toBeLessThanOrEqual(800);
    }
  });
});

describe('getIslandConfig', () => {
  test('returns the config for a known slug', () => {
    const nassau = getIslandConfig('nassau-paradise-island');
    expect(nassau).not.toBeNull();
    expect(nassau?.name).toBe('Nassau');
  });

  test('returns null for an unknown slug (no throw)', () => {
    expect(getIslandConfig('atlantis')).toBeNull();
    expect(getIslandConfig('')).toBeNull();
  });

  test('is case-sensitive (matches URL routing)', () => {
    // Next.js routes are case-sensitive; this lookup must match.
    expect(getIslandConfig('NASSAU-PARADISE-ISLAND')).toBeNull();
  });
});

describe('getIslandDbSlug', () => {
  test('returns dbSlug when set', () => {
    const paradise = getIslandConfig('paradise-island');
    expect(paradise).not.toBeNull();
    if (paradise) {
      expect(getIslandDbSlug(paradise)).toBe('nassau-paradise-island');
    }
  });

  test('falls back to slug when dbSlug is absent', () => {
    const nassau = getIslandConfig('nassau-paradise-island');
    expect(nassau).not.toBeNull();
    if (nassau) {
      // Nassau has no dbSlug override.
      expect(getIslandDbSlug(nassau)).toBe('nassau-paradise-island');
    }
  });

  test('paradise-island shares Supabase rows with Nassau', () => {
    // Specific contract from the file's docstring — paradise-island
    // queries Nassau's rows. Pin it.
    const paradise = getIslandConfig('paradise-island');
    const nassau = getIslandConfig('nassau-paradise-island');
    expect(paradise && nassau).toBeTruthy();
    if (paradise && nassau) {
      expect(getIslandDbSlug(paradise)).toBe(getIslandDbSlug(nassau));
    }
  });

  test('harbour-island shares Supabase rows with Eleuthera', () => {
    const harbour = getIslandConfig('harbour-island');
    const eleuthera = getIslandConfig('eleuthera-harbour-island');
    expect(harbour && eleuthera).toBeTruthy();
    if (harbour && eleuthera) {
      expect(getIslandDbSlug(harbour)).toBe(getIslandDbSlug(eleuthera));
    }
  });
});

describe('getIslandHeroImage', () => {
  test('returns a non-empty URL for every catalog entry', () => {
    for (const cfg of ISLAND_CONFIGS) {
      const url = getIslandHeroImage(cfg);
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    }
  });
});
