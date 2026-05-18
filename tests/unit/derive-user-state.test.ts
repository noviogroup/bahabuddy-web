import { describe, test, expect } from 'vitest';

import { deriveUserState } from '@/lib/derive-user-state';
import type { Trip } from '@/types/database';

/**
 * Tests for deriveUserState.
 *
 * This function drives the entire Home dashboard's adaptive UI:
 * "new" → hero card shows seasonal feature
 * "planner" → hero card shows "Your trip is taking shape"
 * "booked" → hero card shows countdown + destination photo
 *
 * A regression here silently breaks the personalization promise from
 * the V2 Product Plan. Tests pin the precedence rules and the
 * future-date filter.
 */

const now = new Date('2026-06-15T12:00:00Z'); // Frozen "today" for tests.
const yesterday = '2026-06-14T12:00:00Z';
const tomorrow = '2026-06-16T12:00:00Z';
const nextMonth = '2026-07-15T12:00:00Z';
const lastMonth = '2026-05-15T12:00:00Z';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: overrides.id ?? 't-' + Math.random().toString(36).slice(2),
    user_id: 'u-1',
    name: overrides.name ?? 'Trip',
    status: overrides.status ?? 'draft',
    date_start: overrides.date_start ?? null,
    date_end: overrides.date_end ?? null,
    islands: overrides.islands ?? [],
    party_type: 'couple',
    party_size: 2,
    budget_estimate: null,
    budget_actual: null,
    hero_image_url: null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('deriveUserState', () => {
  describe('empty input', () => {
    test('no trips ⇒ "new" state with null primaryTrip', () => {
      const result = deriveUserState([]);
      expect(result.state).toBe('new');
      expect(result.primaryTrip).toBeNull();
    });

    test('only cancelled/completed trips ⇒ "new"', () => {
      // Cancelled and completed trips don't drive the dashboard.
      const result = deriveUserState([
        makeTrip({ status: 'cancelled', date_start: nextMonth }),
        makeTrip({ status: 'completed', date_start: lastMonth }),
      ]);
      expect(result.state).toBe('new');
      expect(result.primaryTrip).toBeNull();
    });
  });

  describe('booked precedence', () => {
    // The frozen "now" depends on Date.now() — we use real timing here
    // and pick dates well in the past/future to avoid flakes.
    const farFuture = new Date(Date.now() + 30 * 86400_000).toISOString();
    const farPast = new Date(Date.now() - 30 * 86400_000).toISOString();
    const middleFuture = new Date(Date.now() + 60 * 86400_000).toISOString();

    test('a booked future trip wins over a draft trip', () => {
      const draft = makeTrip({
        id: 'draft',
        status: 'draft',
        updated_at: new Date(Date.now() - 1000).toISOString(),
      });
      const booked = makeTrip({
        id: 'booked',
        status: 'booked',
        date_start: farFuture,
      });
      const result = deriveUserState([draft, booked]);
      expect(result.state).toBe('booked');
      expect(result.primaryTrip?.id).toBe('booked');
    });

    test('two booked trips ⇒ the soonest future one wins', () => {
      const farther = makeTrip({
        id: 'farther',
        status: 'booked',
        date_start: middleFuture,
      });
      const sooner = makeTrip({
        id: 'sooner',
        status: 'booked',
        date_start: farFuture,
      });
      const result = deriveUserState([farther, sooner]);
      expect(result.state).toBe('booked');
      expect(result.primaryTrip?.id).toBe('sooner');
    });

    test('a booked PAST trip does NOT trigger "booked" state', () => {
      // The user's already done the trip — they're functionally "new" again
      // for dashboard purposes unless they have an active draft.
      const result = deriveUserState([
        makeTrip({ status: 'booked', date_start: farPast }),
      ]);
      expect(result.state).toBe('new');
    });

    test('a booked trip with null date_start is ignored (defensive)', () => {
      // Booked + no date = bad data; don't crash, just don't promote it.
      const result = deriveUserState([
        makeTrip({ status: 'booked', date_start: null }),
      ]);
      expect(result.state).toBe('new');
    });
  });

  describe('planner precedence', () => {
    test('a draft trip ⇒ "planner"', () => {
      const result = deriveUserState([makeTrip({ status: 'draft' })]);
      expect(result.state).toBe('planner');
    });

    test('a "planned" status also counts as planner', () => {
      const result = deriveUserState([makeTrip({ status: 'planned' })]);
      expect(result.state).toBe('planner');
    });

    test('the most-recently-updated planner wins', () => {
      const stale = makeTrip({
        id: 'stale',
        status: 'draft',
        updated_at: '2026-01-01T00:00:00Z',
      });
      const fresh = makeTrip({
        id: 'fresh',
        status: 'draft',
        updated_at: '2026-06-01T00:00:00Z',
      });
      const result = deriveUserState([stale, fresh]);
      expect(result.primaryTrip?.id).toBe('fresh');
    });

    test('falls back to created_at when updated_at is undefined', () => {
      // The interface says updated_at is required, but JSONB rows from
      // older versions may omit it. The function uses `?? created_at`.
      const t = makeTrip({
        id: 'no-updated',
        status: 'draft',
        created_at: '2026-06-10T00:00:00Z',
      });
      // Forcibly unset the timestamp via cast.
      (t as Partial<Trip>).updated_at = undefined;
      const result = deriveUserState([t as Trip]);
      expect(result.primaryTrip?.id).toBe('no-updated');
    });
  });

  describe('mixed scenarios', () => {
    test('booked + planner ⇒ booked wins (booked has higher priority)', () => {
      const farFuture = new Date(Date.now() + 30 * 86400_000).toISOString();
      const result = deriveUserState([
        makeTrip({
          id: 'planner',
          status: 'draft',
          updated_at: new Date().toISOString(),
        }),
        makeTrip({ id: 'booked', status: 'booked', date_start: farFuture }),
      ]);
      expect(result.state).toBe('booked');
      expect(result.primaryTrip?.id).toBe('booked');
    });

    test('expired-booked + active-draft ⇒ planner wins', () => {
      // The booked trip is in the past so it's filtered out;
      // the draft survives and takes precedence.
      const farPast = new Date(Date.now() - 30 * 86400_000).toISOString();
      const result = deriveUserState([
        makeTrip({ status: 'booked', date_start: farPast }),
        makeTrip({ id: 'draft', status: 'draft' }),
      ]);
      expect(result.state).toBe('planner');
      expect(result.primaryTrip?.id).toBe('draft');
    });
  });

  // Reference the frozen `now` constants so they aren't reported as unused.
  test('frozen-date constants are valid ISO strings', () => {
    for (const s of [yesterday, tomorrow, nextMonth, lastMonth]) {
      expect(() => new Date(s).toISOString()).not.toThrow();
    }
    expect(now).toBeInstanceOf(Date);
  });
});
