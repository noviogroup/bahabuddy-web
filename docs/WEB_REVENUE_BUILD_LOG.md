# Baha Buddy Web Revenue Build Log

## Date

2026-06-07

## Objective

Implement and document the first set of web-facing revenue features based on `docs/PRODUCT_REVENUE_BLUEPRINT.md`, then tighten the public UI/UX around immediate concierge payment, partner intake, and conversion clarity.

The admin portal is being developed separately. This build focuses on the public web app features that create traveler demand, partner interest, paid concierge transactions, and future data handoff points for admin operations.

## Summary of Work Completed

### 1. Reusable Concierge Revenue CTA Component

**File added:**

```text
src/components/revenue/ConciergeRevenueBand.tsx
```

**Purpose:**

A reusable web CTA section that promotes the Concierge Trip Plan as the first monetizable offer.

**Where it can be used:**

- Home page
- Explore page
- Island guide pages
- Saved trip page
- Dashboard
- Chat result page
- Deal detail pages

---

### 2. Home Page Conversion Improvements

**Files updated / added:**

```text
src/app/page.tsx
src/components/HeroSection.tsx
src/components/TrustBand.tsx
```

**Changes made:**

- Added `Concierge` to the top navigation.
- Added a hero CTA: `Want local help? Pay for a Concierge Trip Plan →`.
- Added `TrustBand` directly under the hero.
- Added `ConciergeRevenueBand` between `AppFeaturesSection` and `DealsSection`.

**Trust points:**

- Built in The Bahamas
- AI-powered planning
- Local concierge review
- Visa/document support
- Partner-backed recommendations

---

### 3. Immediate Concierge Payment Flow

**Files added / updated:**

```text
src/app/api/concierge-checkout/route.ts
src/app/concierge-trip-plan/page.tsx
src/app/concierge-trip-plan/success/page.tsx
```

**Purpose:**

Allow users to pay immediately for concierge services without a manual invoice.

**Payment flow:**

```text
Concierge pricing card → POST /api/concierge-checkout → Stripe Checkout → /concierge-trip-plan/success → paid trip details form
```

**Server-defined offers:**

| Offer | Price | Offer ID |
|---|---:|---|
| Quick Review | $49 | `quick_review` |
| Concierge Trip Plan | $149 | `concierge_trip_plan` |
| Full Planning Support | $299 | `full_planning_support` |

**Important implementation notes:**

- Prices are defined server-side in `src/app/api/concierge-checkout/route.ts`.
- The route creates Stripe Checkout Sessions through Stripe's REST API.
- The route requires `STRIPE_SECRET_KEY` in the deployment environment.
- Success URL includes the Stripe session ID for reconciliation.
- The post-payment success page collects trip details after payment through the `baha-buddy-paid-concierge-details` Netlify-compatible form.
- The previous pre-payment manual concierge request form was removed from the main concierge purchase flow.

---

### 4. Strengthened Concierge Trip Plan Page

**File updated:**

```text
src/app/concierge-trip-plan/page.tsx
```

**Sections now included:**

1. Hero focused on immediate payment
2. Stripe Checkout pricing cards
3. How it works
4. What is included
5. Why local review matters
6. Best-for audience chips
7. Sample itinerary preview
8. Travel-document lead form
9. Footer
10. Chat widget

**UX change:**

The page now communicates that payments are processed securely through Stripe and that no manual invoice is required.

---

### 5. Partner Recruitment Landing Page

**File updated:**

```text
src/app/partners/page.tsx
```

**Purpose:**

A public partner-facing landing page to recruit hotels, tour operators, restaurants, transportation providers, local guides, and tourism stakeholders.

**Strengthened sections:**

- Founding Partner positioning
- What partners get
- Placement examples
- Partner categories
- Partner tiers
- Partner application form

**Partner value points:**

- Visibility in Explore and island guide pages
- Recommendation eligibility inside Buddy planning flows
- Deal and featured placement opportunities
- Concierge referral opportunities for high-intent travelers
- Campaign inclusion for seasonal or island-specific promotions
- Performance reporting as partner analytics mature

---

### 6. Revenue Capture Form Components

**Files added:**

```text
src/components/revenue/ConciergeInterestForm.tsx
src/components/revenue/PartnerApplicationForm.tsx
src/components/revenue/TravelDocumentLeadForm.tsx
```

**Forms currently active:**

| Form name | Purpose | Page |
|---|---|---|
| `baha-buddy-partner-application` | Captures partner applications | `/partners` |
| `baha-buddy-travel-document-lead` | Captures Baha Visa / document inquiries | `/concierge-trip-plan` |
| `baha-buddy-paid-concierge-details` | Captures trip details after payment | `/concierge-trip-plan/success` |

`ConciergeInterestForm` remains available as a fallback component but is no longer the primary concierge purchase path.

---

### 7. Destination Card Trust Cleanup

**File updated:**

```text
src/components/DestinationShowcase.tsx
```

**Change made:**

Replaced static `4.8` ratings with trust labels.

**Trust labels:**

- Buddy Pick
- Popular
- Best for Families
- Great First Trip
- Local Favorite
- Easy to Plan

---

### 8. Footer Revenue Navigation

**File updated:**

```text
src/components/Footer.tsx
```

**Changes made:**

Added footer links for:

- `/concierge-trip-plan` under `Plan your trip`
- `/partners` under `Company`

---

### 9. Revenue Capture Database Migration

**File added:**

```text
supabase/migrations/202606070001_web_revenue_capture.sql
```

**Purpose:**

Prepares the Supabase data layer for the admin portal and future API-based capture.

**Tables included:**

- `concierge_orders`
- `partner_applications`
- `travel_document_leads`

**Also includes:**

- Row-level security enabled
- Public insert policies for future web API capture
- Status and created-at indexes for admin queues

---

### 10. UI Pattern Documentation

**File added:**

```text
docs/WEB_UI_PATTERNS.md
```

**Includes:**

- Hero pattern
- Trust band pattern
- CTA band pattern
- Pricing card pattern
- Form pattern
- Destination card pattern
- Partner card pattern
- Payment flow pattern
- Partner page pattern
- Page hierarchy standard

---

### 11. Revenue Roadmap Documentation

**File added / updated:**

```text
docs/WEB_REVENUE_FEATURES_ROADMAP.md
```

**Purpose:**

Developer and product roadmap for the web-side revenue features.

---

## Files Changed

```text
src/app/api/concierge-checkout/route.ts
src/app/concierge-trip-plan/page.tsx
src/app/concierge-trip-plan/success/page.tsx
src/app/page.tsx
src/app/partners/page.tsx
src/components/HeroSection.tsx
src/components/TrustBand.tsx
src/components/DestinationShowcase.tsx
src/components/revenue/ConciergeRevenueBand.tsx
src/components/revenue/ConciergeInterestForm.tsx
src/components/revenue/PartnerApplicationForm.tsx
src/components/revenue/TravelDocumentLeadForm.tsx
src/components/Footer.tsx
supabase/migrations/202606070001_web_revenue_capture.sql
docs/WEB_REVENUE_FEATURES_ROADMAP.md
docs/WEB_REVENUE_BUILD_LOG.md
docs/WEB_UI_PATTERNS.md
```

## Required Environment Variables

Add this to the deployment environment before testing live payments:

```bash
STRIPE_SECRET_KEY=sk_live_or_test_key_here
```

Existing Stripe publishable-key configuration is still used by the older dashboard PaymentElement flow, but the new concierge flow uses Stripe Checkout from the server route.

## Recommended Immediate Follow-Up

### Technical

1. Run local build and lint:

```bash
npm install
npm run lint
npm run build
```

2. Confirm routes render:

```text
/
/concierge-trip-plan
/concierge-trip-plan/success
/partners
```

3. Test Stripe checkout in test mode:

```text
POST /api/concierge-checkout with offer_id=quick_review
POST /api/concierge-checkout with offer_id=concierge_trip_plan
POST /api/concierge-checkout with offer_id=full_planning_support
```

4. Confirm Netlify Forms are detected after deployment:

```text
baha-buddy-partner-application
baha-buddy-travel-document-lead
baha-buddy-paid-concierge-details
```

5. Apply the Supabase migration when ready:

```bash
supabase db push
```

### Product

1. Confirm final copy for each paid concierge tier.
2. Confirm payment notification routing in Stripe.
3. Confirm who receives paid concierge detail form notifications.
4. Confirm fulfillment SLA after payment.
5. Confirm whether Baha Visa leads should go to Baha Visa email, CRM, or admin queue.
6. Confirm first 10-20 founding partner targets.

### Admin Portal Dependency

The admin portal should eventually support:

- Stripe-paid concierge order queue
- Partner application queue
- Travel-document lead queue
- Partner record approval
- Revenue reporting
- CTA source attribution
- Stripe session/payment reconciliation

## Known Limitations

- Stripe Checkout is connected, but webhook-to-Supabase order creation is not yet implemented.
- Supabase tables are prepared in migration form but must still be applied.
- Concierge details are captured after payment through a Netlify-compatible form until admin order sync is connected.
- Analytics events are documented but not yet implemented.
- Build/lint could not be executed in this environment because the repository was modified through the GitHub connector rather than a local working tree with installed dependencies.

## Implementation Principle

The concierge flow should now be payment-first, not manual-first.

The early product should validate whether travelers will pay for concierge planning while still keeping fulfillment manageable through a post-payment details form and future admin queue integration.
