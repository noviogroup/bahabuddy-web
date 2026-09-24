# Web canonical-deals completion

**Date:** September 23, 2026

**Branch:** `codex/web-canonical-deals`

## Result

The public deals page, stay-deals rail, and per-island deal cards now share one
Admin-first loader. It reads active, current `deals` rows and maps linked
`places` and `partners` data into the public card model. Linked place media,
island, category, description, amenities, and partner identity remain attached
to the approved offer.

The loader excludes inactive, scheduled, and expired Admin offers. If the
requested scope has no approved offer, it uses active `bahamas_deals` rows as a
temporary compatibility source.

The public web no longer invents promotions when inventory is empty. Removed
fallbacks include the hardcoded Swimming Pigs day tour and the Long Island dive
package that borrowed Exuma photography. Empty inventory now renders an honest
partner-offers updating state.

## Validation

- Standalone-repository Vitest coverage suite: **442 tests passed across 107
  files**, with two cross-repository parity checks explicitly skipped because a
  standalone GitHub checkout does not contain the mobile app or root policy.
- The same grounding contract passed all **7 checks** in the full local Baha
  Buddy workspace, including mobile tool and canonical-policy parity.
- Focused canonical deal, public deals, stay deals, and media-policy checks:
  **13 tests passed**.
- A clean Node 20 `npm ci` now passes with the repository npm peer policy; this
  prevents the Sanity optional-peer resolver from failing before CI can run.
- `npm run lint` and the exact CI `npm run test:coverage` command passed after
  the clean install.
- `npm run build`: passed, including Next.js lint, source type checking, and all
  115 generated pages. The exact CI placeholder environment was used.
- A standalone `npx tsc --noEmit` still reports existing test-only type errors
  in unrelated concierge, island mock, login, emoji, and typography test files.
  The production Next.js type/build gate is green.

## Remaining content gate

The shared live Supabase project returned zero active Admin deals during the
same-day mobile simulator UAT. These web surfaces therefore continue to show
legacy compatibility rows until operations publishes approved offers with
record-specific licensed media. Rerun the public deals, stays, and island-guide
smoke after publication and require a nonzero canonical count.
