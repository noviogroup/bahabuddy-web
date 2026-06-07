# Baha Buddy Foundation Test Results

## Purpose

This file logs the pass/fail results of foundation tests run by the team before applying critical changes such as enabling RLS on `public.trips`, migrating canonical place data, or building new product modules.

See [FOUNDATION_TEST_PLAN.md](./FOUNDATION_TEST_PLAN.md) for the full test definitions and steps.

---

## How to log results

When you run a test, add a row to the relevant table below. Use this format:

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|

- **Tester**: agent name or "board"
- **Environment**: `local`, `staging`, or `production`
- **Result**: `Pass`, `Fail`, or `Skip`
- **Notes**: what you observed, or why skipped
- **Follow-up issue**: Paperclip identifier if a bug was filed (e.g. `BAH-110`)

---

## Status summary

| Suite | Tests | Passed | Failed | Skipped | Ready? |
|-------|-------|--------|--------|---------|--------|
| 1. Auth + profile | 2 | — | — | — | ⏳ |
| 2. Saved trips | 4 | — | — | — | ⏳ |
| 3. Trip items | 3 | — | — | — | ⏳ |
| 4. Saved conversations | 2 | — | — | — | ⏳ |
| 5. Sharing + collaboration | 3 | — | — | — | ⏳ |
| 6. Trips RLS | 5 | — | — | — | ⏳ |
| 7. Places data | 5 | — | — | — | ⏳ |
| 8. Booking + revenue | 4 | — | — | — | ⏳ |
| 9. Admin | 3 | — | — | — | ⏳ |
| 10. Edge Functions | 4 | — | — | — | ⏳ |

**Foundation gate status:** ⏳ Testing in progress — RLS not yet enabled

---

## 1. Authentication + user profile

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 1.1 Web login/profile | | | | | | |
| 1.2 Mobile anon onboarding | | | | | | |

---

## 2. Saved trips

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 2.1 Web create trip from chat | | | | | | |
| 2.2 Mobile create trip | | | | | | |
| 2.3 Cross-platform trip visibility | | | | | | |
| 2.4 Unauthorized trip access ⚠️ | | | | | | |

> ⚠️ Test 2.4 is a gate — trips RLS cannot be enabled until this passes on both web and mobile.

---

## 3. Trip items

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 3.1 Accommodation CRUD | | | | | | |
| 3.2 Flight CRUD | | | | | | |
| 3.3 Activity CRUD | | | | | | |

---

## 4. Saved conversations

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 4.1 Web saved conversations | | | | | | |
| 4.2 Mobile saved conversations | | | | | | |

---

## 5. Sharing + collaboration

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 5.1 Trip share link | | | | | | |
| 5.2 Trip invite (create + accept) | | | | | | |
| 5.3 Collaborator read access | | | | | | |

---

## 6. Trips RLS validation

> Run these only after enabling RLS in a controlled test environment. See [TRIPS_RLS_ENABLEMENT_PLAN.md](./TRIPS_RLS_ENABLEMENT_PLAN.md).

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 6.1 Owner read/write/delete | | | | | | |
| 6.2 Non-owner restriction | | | | | | |
| 6.3 Collaborator access | | | | | | |
| 6.4 Admin/service-role access | | | | | | |
| 6.5 Rollback readiness | | | | | | |

---

## 7. Places data

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 7.1 Web hotel directory | | | | | | |
| 7.2 Web restaurant directory | | | | | | |
| 7.3 Mobile hotel/restaurant screens | | | | | | |
| 7.4 Google Places chat recommendation | | | | | | |
| 7.5 Canonical places migration readiness | | | | | | |

---

## 8. Booking + revenue

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 8.1 Flight search | | | | | | |
| 8.2 Duffel order flow | | | | | | |
| 8.3 Hotel booking/prebook flow | | | | | | |
| 8.4 Stripe checkout test | | | | | | |

---

## 9. Admin

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 9.1 Admin login + access control | | | | | | |
| 9.2 User detail visibility | | | | | | |
| 9.3 Billing/service dashboard | | | | | | |

---

## 10. Edge Functions

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 10.1 AI/chat function | | | | | | |
| 10.2 Google Places sync/photo | | | | | | |
| 10.3 Share/invite functions | | | | | | |
| 10.4 Booking functions | | | | | | |

---

## Foundation gate decision log

| Date | Decision | Decided by | Notes |
|------|----------|------------|-------|
| | RLS enabled on public.trips | | After suites 2, 3, 5, 6 pass |
| | Canonical places migration approved | | After suite 7 passes |
| | Booking modules marked active | | After suite 8 passes |
| | Phase 4 development unlocked | | After all critical suites pass |
