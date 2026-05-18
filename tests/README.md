# Baha Buddy Web — Testing Guide

The public-facing marketing site and signed-in dashboard at
**bahabuddy.com**. This suite focuses on the high-traffic logic
layer — adaptive UI, chat parsing, and the island catalog that joins
the web routes to Sanity and Supabase.

---

## Stack

- **Vitest** — test runner (native ESM/TS, Jest-compatible API, fast)
- **React Testing Library** + **`@testing-library/jest-dom`** — component tests (scaffolded; expand as needed)
- **`@testing-library/user-event`** — realistic interactions
- **jsdom** — DOM environment

Playwright E2E is the planned next step — share-page rendering and the
trip dashboard are the two surfaces most worth gating end-to-end.

---

## Layout

```
tests/
├── README.md                                ← this file
└── unit/
    ├── derive-user-state.test.ts            ← new / planner / booked precedence
    ├── adaptive-chips.test.ts               ← chip-set selection by dominant card type
    ├── chat-utils.test.ts                   ← parseCardsFromContent + deriveTitleFromMessage
    └── island-config.test.ts                ← ISLAND_CONFIGS catalog invariants + lookup helpers
```

---

## What each suite locks down

| Suite | Pins these contracts |
|---|---|
| **derive-user-state** | The 3 states (`new`/`planner`/`booked`) and their precedence. A booked trip in the **future** wins; a booked trip in the **past** is filtered out (user is "done" with it). Soonest-future booked wins among ties. Most-recently-updated planner wins. Defensive: `updated_at` falls back to `created_at` when undefined. |
| **adaptive-chips** | Default chip set, every single-card-type chip set, the **priority order** (summary > day_plan > flight > hotel > activity > restaurant > destination > map), `"mixed"` card unwrapping, defensive handling of mixed-without-cards. Every chip has a non-empty label AND prompt (contract test). |
| **chat-utils** | Both fence types (` ```card-data ` and ` ```json `); JSON-shape detection (must have `card_type` or `cards`); malformed JSON is **left in place** (better than silently dropping content); `deriveTitleFromMessage` **never returns empty** — falls back to `"New Chat"` (would break the chat sidebar otherwise). |
| **island-config** | **Catalog invariants** — every slug unique, every slug URL-safe (lowercase + hyphens), every `dbSlug` points to a real sibling, every `heroImageKey` resolves to a non-empty URL in `BahaImages`. Plus: `paradise-island` and `harbour-island` correctly share their Supabase rows with their parent islands (Nassau and Eleuthera respectively). |

---

## Running

```bash
# Full suite
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report (HTML + lcov + console summary)
npm run test:coverage
open coverage/index.html

# Vitest UI in the browser (great for debugging)
npm run test:ui
```

---

## CI

`.github/workflows/ci.yml` runs `npm ci` → `npm run lint` →
`npm test` → `npm run build` on every push and PR to `main` /
`develop`. Build fails if any step fails.

---

## Extending the suite

### Add a pure-logic test
Follow the pattern in `tests/unit/`. The Vitest API is identical to
Jest: `describe`, `test` (or `it`), `expect`. Use `vi.fn()` for mocks
and `vi.mock('@/module/path')` for module-level stubs.

### Add a hook test
Hooks live under `src/hooks/`. Render them with
`@testing-library/react`'s `renderHook`:

```ts
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '@/hooks/use-my-hook';

test('useMyHook does the thing', () => {
  const { result } = renderHook(() => useMyHook());
  act(() => result.current.doTheThing());
  expect(result.current.state).toBe('done');
});
```

### Add a component test
Mock any module that pulls Supabase, Sanity, Stripe, or `next/navigation`:

```ts
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/sanity/client', () => ({
  client: { fetch: vi.fn().mockResolvedValue({ destinations: [] }) },
}));
```

Then render with `@testing-library/react` and assert on accessible
queries (`getByRole`, `getByLabelText`) before falling back to
`data-testid`.

### Add a server-component / page test
**Don't.** Server components compose Supabase + Sanity queries and
JSX. They're best tested end-to-end with Playwright once we add it.
Unit-testing them devolves into mocking everything they touch, which
defeats the point.

---

## What's deliberately NOT tested here

- **Server components and route handlers** — covered by E2E (planned).
- **Sanity GROQ queries** — depend on schema and CDN; tested by content
  preview + production smoke checks instead.
- **Stripe checkout** — runs against a live Stripe test mode; covered
  manually until we wire a webhook fixture suite.
- **Middleware redirects** — best covered by E2E with `playwright test`
  using real cookie state.
- **Mobile parity drift** — the web mirrors mobile chat logic; that's
  enforced by code review, not automated tests, because the source
  files diverge by design (chat-tools.ts has architectural deviations
  documented in its docstring).

---

## When to write a new test

Before fixing a bug, write a failing test that reproduces it. The
catalog-invariant pattern in `island-config.test.ts` is the model
for "schema enforcement" tests — every time you add a config-driven
feature, the corresponding invariant test should follow.
