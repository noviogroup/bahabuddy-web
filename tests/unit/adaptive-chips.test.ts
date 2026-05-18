import { describe, test, expect } from 'vitest';

import { getAdaptiveChips } from '@/lib/adaptive-chips';
import type { ParsedCard } from '@/lib/chat-utils';

/**
 * Tests for getAdaptiveChips.
 *
 * The chip selection adapts to what Buddy just showed. The logic has
 * a priority list (summary > day_plan > flight > hotel > activity >
 * restaurant > destination > map) that's surprisingly easy to break
 * when adding new card types. These tests pin the priority order and
 * the "mixed" card unwrapping behavior.
 */

function card(type: ParsedCard['card_type']): ParsedCard {
  return { card_type: type };
}

describe('getAdaptiveChips — defaults', () => {
  test('no cards ⇒ default chip set with "Surprise me" gold variant', () => {
    const chips = getAdaptiveChips();
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.label)).toEqual([
      'Show me flights',
      'Where to stay?',
      'Surprise me',
    ]);
    expect(chips.find((c) => c.label === 'Surprise me')?.variant).toBe('gold');
  });

  test('empty cards array also returns defaults', () => {
    const chips = getAdaptiveChips([]);
    expect(chips[0].label).toBe('Show me flights');
  });
});

describe('getAdaptiveChips — single-type chip sets', () => {
  test('hotel cards', () => {
    const chips = getAdaptiveChips([card('hotel')]);
    expect(chips.map((c) => c.label)).toEqual([
      'Cheaper options',
      'Different island',
      'Closer to beach',
    ]);
  });

  test('restaurant cards', () => {
    const chips = getAdaptiveChips([card('restaurant')]);
    expect(chips.map((c) => c.label)).toEqual([
      'Different cuisine',
      'Family-friendly',
      'Top-rated',
    ]);
  });

  test('flight cards', () => {
    const chips = getAdaptiveChips([card('flight')]);
    expect(chips.map((c) => c.label)).toEqual([
      'Earlier flight',
      'Different date',
      'Direct only',
    ]);
  });

  test('activity cards', () => {
    const chips = getAdaptiveChips([card('activity')]);
    expect(chips.map((c) => c.label)).toEqual([
      'More activities',
      'Different vibe',
      'Kid-friendly',
    ]);
  });

  test('day_plan cards', () => {
    const chips = getAdaptiveChips([card('day_plan')]);
    expect(chips.map((c) => c.label)).toEqual([
      'Add another day',
      'Swap morning',
      'Different pace',
    ]);
  });

  test('destination cards include a "Plan this" gold chip', () => {
    const chips = getAdaptiveChips([card('destination')]);
    expect(chips.map((c) => c.label)).toEqual([
      'Tell me more',
      'Plan this',
      'Compare islands',
    ]);
    expect(chips.find((c) => c.label === 'Plan this')?.variant).toBe('gold');
  });

  test('map cards include a "Plan this" gold chip', () => {
    const chips = getAdaptiveChips([card('map')]);
    expect(chips.map((c) => c.label)).toEqual([
      'Get directions',
      'Nearby spots',
      'Plan this',
    ]);
    expect(chips.find((c) => c.label === 'Plan this')?.variant).toBe('gold');
  });

  test('summary cards include a "Love it!" gold chip (book-ready moment)', () => {
    const chips = getAdaptiveChips([card('summary')]);
    expect(chips.map((c) => c.label)).toEqual([
      'Love it!',
      'Cheaper options',
      'Add activities',
    ]);
    expect(chips.find((c) => c.label === 'Love it!')?.variant).toBe('gold');
  });
});

describe('getAdaptiveChips — priority ordering', () => {
  test('summary beats day_plan beats every other type', () => {
    const cards: ParsedCard[] = [
      card('hotel'),
      card('day_plan'),
      card('summary'), // wins
      card('flight'),
    ];
    const chips = getAdaptiveChips(cards);
    expect(chips[0].label).toBe('Love it!');
  });

  test('day_plan beats flight/hotel/activity/restaurant/destination/map', () => {
    const cards: ParsedCard[] = [
      card('destination'),
      card('hotel'),
      card('day_plan'), // wins
      card('flight'),
    ];
    expect(getAdaptiveChips(cards)[0].label).toBe('Add another day');
  });

  test('flight beats hotel/activity/restaurant', () => {
    expect(
      getAdaptiveChips([card('restaurant'), card('flight'), card('hotel')])[0]
        .label,
    ).toBe('Earlier flight');
  });

  test('hotel beats activity/restaurant/destination/map', () => {
    expect(
      getAdaptiveChips([card('map'), card('restaurant'), card('hotel')])[0]
        .label,
    ).toBe('Cheaper options');
  });
});

describe('getAdaptiveChips — mixed card unwrapping', () => {
  test('a "mixed" wrapper unwraps to its nested cards for type detection', () => {
    // Buddy often returns mixed bundles like [hotels+activities]. The
    // priority list runs against the nested types, not the literal
    // "mixed" string.
    const mixed: ParsedCard = {
      card_type: 'mixed',
      cards: [card('restaurant'), card('hotel')],
    };
    const chips = getAdaptiveChips([mixed]);
    // hotel > restaurant, so hotel chips win.
    expect(chips[0].label).toBe('Cheaper options');
  });

  test('mixed with a summary inside still triggers summary priority', () => {
    const mixed: ParsedCard = {
      card_type: 'mixed',
      cards: [card('hotel'), card('summary')],
    };
    expect(getAdaptiveChips([mixed])[0].label).toBe('Love it!');
  });

  test('mixed with empty cards array falls through to defaults', () => {
    const mixed: ParsedCard = { card_type: 'mixed', cards: [] };
    expect(getAdaptiveChips([mixed])[0].label).toBe('Show me flights');
  });

  test('mixed without a cards property falls through to defaults', () => {
    // Defensive: malformed mixed wrappers shouldn't crash.
    const mixed: ParsedCard = { card_type: 'mixed' };
    expect(getAdaptiveChips([mixed])[0].label).toBe('Show me flights');
  });
});

describe('getAdaptiveChips — chip shape contract', () => {
  test('every chip has a non-empty label and prompt', () => {
    const allCardTypes: Array<ParsedCard['card_type']> = [
      'hotel',
      'restaurant',
      'activity',
      'flight',
      'day_plan',
      'summary',
      'map',
      'destination',
    ];
    for (const t of allCardTypes) {
      const chips = getAdaptiveChips([card(t)]);
      for (const chip of chips) {
        expect(chip.label.length, `${t}: empty label`).toBeGreaterThan(0);
        expect(chip.prompt.length, `${t}: empty prompt`).toBeGreaterThan(0);
      }
    }
  });

  test('default chips also have non-empty prompts', () => {
    for (const chip of getAdaptiveChips()) {
      expect(chip.prompt.length).toBeGreaterThan(0);
    }
  });
});
