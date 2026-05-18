# Archive — pre-Phase-C.1 page snapshots

These files were moved out of `src/app/` during the route group migration (C.1). They are NOT routed by Next.js (the `_archive/` directory sits outside the `app/` tree). Kept here for reference until C.1 is verified in production, after which they can be deleted.

## Files

- `dashboard-page-pre-c1.tsx` — the old `src/app/dashboard/page.tsx` that wrapped its own `<DashboardShell>`. Replaced by `src/app/(dashboard)/dashboard/page.tsx` which is just page content (the shell is provided by `src/app/(dashboard)/layout.tsx`).
- `trip-detail-page-pre-c1.tsx` — the old `src/app/trip/[id]/page.tsx` with its own standalone header and bottom `<ChatWidget>`. Replaced by `src/app/(dashboard)/trip/[id]/page.tsx` which removes the standalone header (the shell's Sidebar provides nav) and removes `<ChatWidget>` (the shell's docked `<ChatPanel>` covers it).

## When to delete

After:
1. The site is deployed and tested with the new route group in production
2. No regressions reported for at least one user session involving navigation between `/dashboard` ↔ `/trip/[id]` ↔ `/dashboard/chat`
3. Chat state persistence confirmed working (open chat thread → navigate to a trip → chat thread still open with state intact)
